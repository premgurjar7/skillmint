const { Order, Course, User, Wallet, Transaction } = require('../config/db');
const razorpay = require('../config/razorpay');
const { verifyRazorpayPayment, verifyWalletPayment } = require('../utils/verifyPayment');
const { sendEmail } = require('../config/mail');
const logger = require('../utils/logger');
const AffiliateService = require('./affiliate.service');

class PaymentService {
    // Create Razorpay order
    static async createRazorpayOrder(orderData) {
        try {
            const { userId, courseId, referralCode, couponCode } = orderData;

            // Get course details
            const course = await Course.findById(courseId);
            if (!course) {
                throw new Error('Course not found');
            }

            // Check if user already purchased this course
            const existingOrder = await Order.findOne({
                user: userId,
                course: courseId,
                paymentStatus: 'completed'
            });

            if (existingOrder) {
                throw new Error('You have already purchased this course');
            }

            // Calculate final price
            let finalPrice = course.discountedPrice > 0 ? course.discountedPrice : course.price;
            let discount = 0;

            // Apply coupon if provided
            if (couponCode) {
                // Implement coupon validation and discount calculation
                // const coupon = await validateCoupon(couponCode, userId, courseId);
                // discount = calculateDiscount(finalPrice, coupon);
                // finalPrice -= discount;
            }

            // Create Razorpay order
            const razorpayOrder = await razorpay.createOrder(
                finalPrice,
                'INR',
                `order_${Date.now()}`,
                {
                    userId: userId.toString(),
                    courseId: courseId.toString(),
                    courseTitle: course.title
                }
            );

            // Create order record in database
            const order = new Order({
                orderId: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
                user: userId,
                course: courseId,
                amount: course.price,
                finalAmount: finalPrice,
                discount: discount,
                couponCode: couponCode || null,
                razorpayOrderId: razorpayOrder.id,
                paymentMethod: 'razorpay',
                paymentStatus: 'pending',
                orderStatus: 'pending',
                referralUsed: referralCode ? await this.getReferrerId(referralCode) : null,
                metadata: {
                    ipAddress: orderData.ipAddress,
                    userAgent: orderData.userAgent,
                    device: orderData.device
                }
            });

            await order.save();

            logger.info(`Razorpay order created: ${order._id} for user: ${userId}`);

            return {
                orderId: order._id,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount / 100, // Convert from paise
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID,
                user: {
                    name: orderData.userName,
                    email: orderData.userEmail,
                    phone: orderData.userPhone
                }
            };
        } catch (error) {
            logger.error(`Create Razorpay order error: ${error.message}`);
            throw error;
        }
    }

    // Verify and process Razorpay payment
    static async verifyRazorpayPayment(paymentData) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

            // Verify payment signature
            const verification = verifyRazorpayPayment(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            );

            if (!verification.isValid) {
                throw new Error('Payment verification failed');
            }

            // Get order from database
            const order = await Order.findOne({ razorpayOrderId: razorpay_order_id })
                .populate('user')
                .populate('course');

            if (!order) {
                throw new Error('Order not found');
            }

            // Check if payment already processed
            if (order.paymentStatus === 'completed') {
                throw new Error('Payment already processed');
            }

            // Update order with payment details
            order.razorpayPaymentId = razorpay_payment_id;
            order.razorpaySignature = razorpay_signature;
            order.paymentStatus = 'completed';
            order.orderStatus = 'completed';
            order.paymentMethod = 'razorpay';

            // Calculate earnings
            await order.calculateEarnings();

            // Save updated order
            await order.save();

            // Update course enrollments count
            await Course.findByIdAndUpdate(order.course, {
                $inc: { totalEnrollments: 1 }
            });

            // Process affiliate commission if referral was used
            if (order.referralUsed) {
                await AffiliateService.processCommission(order._id);
            }

            // Send enrollment confirmation email
            await sendEmail(order.user.email, 'courseEnrollment', {
                name: order.user.name,
                courseTitle: order.course.title
            });

            // Create wallet transaction for instructor and platform
            await this.createEarningTransactions(order);

            logger.info(`Payment verified and processed: ${order._id}`);

            return {
                success: true,
                orderId: order._id,
                paymentId: razorpay_payment_id,
                amount: order.finalAmount,
                courseId: order.course._id,
                courseTitle: order.course.title,
                enrollmentDate: order.updatedAt
            };
        } catch (error) {
            logger.error(`Verify Razorpay payment error: ${error.message}`);
            throw error;
        }
    }

    // Process wallet payment
    static async processWalletPayment(orderData) {
        try {
            const { userId, courseId } = orderData;

            // Get course details
            const course = await Course.findById(courseId);
            if (!course) {
                throw new Error('Course not found');
            }

            // Check if user already purchased this course
            const existingOrder = await Order.findOne({
                user: userId,
                course: courseId,
                paymentStatus: 'completed'
            });

            if (existingOrder) {
                throw new Error('You have already purchased this course');
            }

            // Calculate final price
            const finalPrice = course.discountedPrice > 0 ? course.discountedPrice : course.price;

            // Verify wallet has sufficient balance
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.walletBalance < finalPrice) {
                throw new Error('Insufficient wallet balance');
            }

            // Create order record
            const order = new Order({
                orderId: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
                user: userId,
                course: courseId,
                amount: course.price,
                finalAmount: finalPrice,
                discount: course.discountedPrice > 0 ? course.price - course.discountedPrice : 0,
                paymentMethod: 'wallet',
                paymentStatus: 'pending',
                orderStatus: 'pending',
                metadata: {
                    ipAddress: orderData.ipAddress,
                    userAgent: orderData.userAgent,
                    device: orderData.device
                }
            });

            await order.save();

            // Deduct amount from wallet
            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            await wallet.addDebit(finalPrice, `Course purchase: ${course.title}`, {
                referenceType: 'course_purchase',
                referenceId: order._id,
                referenceModel: 'Order'
            });

            // Update user wallet balance
            user.walletBalance -= finalPrice;
            await user.save({ validateBeforeSave: false });

            // Update order status
            order.paymentStatus = 'completed';
            order.orderStatus = 'completed';
            await order.save();

            // Calculate earnings
            await order.calculateEarnings();

            // Update course enrollments
            await Course.findByIdAndUpdate(courseId, {
                $inc: { totalEnrollments: 1 }
            });

            // Process affiliate commission if any
            if (order.referralUsed) {
                await AffiliateService.processCommission(order._id);
            }

            // Send enrollment email
            await sendEmail(user.email, 'courseEnrollment', {
                name: user.name,
                courseTitle: course.title
            });

            // Create earning transactions
            await this.createEarningTransactions(order);

            logger.info(`Wallet payment processed: ${order._id} for user: ${userId}`);

            return {
                success: true,
                orderId: order._id,
                amount: finalPrice,
                courseId: course._id,
                courseTitle: course.title,
                walletBalance: user.walletBalance
            };
        } catch (error) {
            logger.error(`Process wallet payment error: ${error.message}`);
            throw error;
        }
    }

    // Create earning transactions for instructor and platform
    static async createEarningTransactions(order) {
        try {
            const { instructorEarnings, platformEarnings, affiliateCommission } = await order.calculateEarnings();

            // Get instructor and course
            const course = await Course.findById(order.course).populate('instructor');
            if (!course) {
                throw new Error('Course not found');
            }

            // Credit instructor wallet
            if (instructorEarnings > 0) {
                const instructorWallet = await Wallet.findOne({ user: course.instructor._id });
                if (instructorWallet) {
                    await instructorWallet.addCredit(instructorEarnings, `Earnings from course: ${course.title}`, {
                        referenceType: 'course_purchase',
                        referenceId: order._id,
                        referenceModel: 'Order'
                    });

                    // Update instructor's total earnings
                    await User.findByIdAndUpdate(course.instructor._id, {
                        $inc: { totalEarned: instructorEarnings, walletBalance: instructorEarnings }
                    });
                }
            }

            // Credit platform wallet (admin wallet)
            if (platformEarnings > 0) {
                const adminWallet = await Wallet.findOne({ user: process.env.ADMIN_USER_ID });
                if (adminWallet) {
                    await adminWallet.addCredit(platformEarnings, `Platform fee from course: ${course.title}`, {
                        referenceType: 'course_purchase',
                        referenceId: order._id,
                        referenceModel: 'Order'
                    });
                }
            }

            logger.info(`Earning transactions created for order: ${order._id}`);
        } catch (error) {
            logger.error(`Create earning transactions error: ${error.message}`);
            throw error;
        }
    }

    // Get order by ID
    static async getOrderById(orderId, userId = null) {
        try {
            const query = { _id: orderId };
            if (userId) {
                query.user = userId;
            }

            const order = await Order.findOne(query)
                .populate('user', 'name email phone')
                .populate('course', 'title thumbnail price')
                .populate('referralUsed', 'name email');

            if (!order) {
                throw new Error('Order not found');
            }

            return order;
        } catch (error) {
            logger.error(`Get order error: ${error.message}`);
            throw error;
        }
    }

    // Get user orders
    static async getUserOrders(userId, filters = {}, pagination = {}) {
        try {
            const {
                status,
                paymentStatus,
                startDate,
                endDate,
                search
            } = filters;

            const {
                page = 1,
                limit = 10,
                sortBy = '-createdAt'
            } = pagination;

            const query = { user: userId };

            // Filter by order status
            if (status) {
                query.orderStatus = status;
            }

            // Filter by payment status
            if (paymentStatus) {
                query.paymentStatus = paymentStatus;
            }

            // Date range filter
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            // Search by course title
            if (search) {
                const courses = await Course.find({
                    title: { $regex: search, $options: 'i' }
                }).select('_id');
                
                query.course = { $in: courses.map(c => c._id) };
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute query
            const orders = await Order.find(query)
                .populate('course', 'title thumbnail price category')
                .sort(sortBy)
                .skip(skip)
                .limit(limit);

            // Get total count
            const total = await Order.countDocuments(query);

            return {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            logger.error(`Get user orders error: ${error.message}`);
            throw error;
        }
    }

    // Process refund
    static async processRefund(orderId, refundAmount, reason) {
        try {
            const order = await Order.findById(orderId)
                .populate('user')
                .populate('course');

            if (!order) {
                throw new Error('Order not found');
            }

            // Check if order is eligible for refund
            if (!order.canBeRefunded()) {
                throw new Error('Order is not eligible for refund');
            }

            // Check if refund amount is valid
            if (refundAmount > order.finalAmount) {
                throw new Error('Refund amount cannot exceed order amount');
            }

            // Process refund based on payment method
            if (order.paymentMethod === 'razorpay' && order.razorpayPaymentId) {
                // Process Razorpay refund
                const refund = await razorpay.refundPayment(
                    order.razorpayPaymentId,
                    refundAmount,
                    { reason: reason }
                );

                // Update order with refund details
                order.refundStatus = 'completed';
                order.refundAmount = refundAmount;
                order.refundProcessedAt = new Date();
                order.isRefundRequested = true;
            } else if (order.paymentMethod === 'wallet') {
                // Refund to wallet
                const wallet = await Wallet.findOne({ user: order.user._id });
                if (wallet) {
                    await wallet.addCredit(refundAmount, `Refund for order: ${order.orderId}`, {
                        referenceType: 'refund',
                        referenceId: order._id,
                        referenceModel: 'Order',
                        metadata: { reason: reason }
                    });

                    // Update user wallet balance
                    await User.findByIdAndUpdate(order.user._id, {
                        $inc: { walletBalance: refundAmount }
                    });
                }

                order.refundStatus = 'completed';
                order.refundAmount = refundAmount;
                order.refundProcessedAt = new Date();
                order.isRefundRequested = true;
            }

            await order.save();

            // Send refund confirmation email
            await sendEmail(order.user.email, 'refundProcessed', {
                name: order.user.name,
                orderId: order.orderId,
                amount: refundAmount,
                reason: reason
            });

            logger.info(`Refund processed for order: ${orderId}`);

            return {
                success: true,
                message: 'Refund processed successfully',
                refundAmount,
                orderId: order._id
            };
        } catch (error) {
            logger.error(`Process refund error: ${error.message}`);
            throw error;
        }
    }

    // Get payment statistics
    static async getPaymentStats(userId = null, timeframe = 'monthly') {
        try {
            const matchStage = {};
            
            if (userId) {
                matchStage.user = userId;
            }

            // Set date range based on timeframe
            const now = new Date();
            let startDate;

            switch (timeframe) {
                case 'daily':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'weekly':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'monthly':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            matchStage.createdAt = { $gte: startDate };
            matchStage.paymentStatus = 'completed';

            const stats = await Order.aggregate([
                { $match: matchStage },
                {
                    $facet: {
                        // Total revenue
                        totalRevenue: [
                            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
                        ],
                        
                        // Revenue by payment method
                        revenueByMethod: [
                            { $group: { _id: '$paymentMethod', total: { $sum: '$finalAmount' }, count: { $sum: 1 } } }
                        ],
                        
                        // Revenue by course
                        revenueByCourse: [
                            { $group: { _id: '$course', total: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
                            { $sort: { total: -1 } },
                            { $limit: 10 }
                        ],
                        
                        // Daily revenue
                        dailyRevenue: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                    total: { $sum: '$finalAmount' },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],
                        
                        // Monthly revenue
                        monthlyRevenue: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                                    total: { $sum: '$finalAmount' },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],
                        
                        // Average order value
                        avgOrderValue: [
                            { $group: { _id: null, avg: { $avg: '$finalAmount' } } }
                        ],
                        
                        // Top customers
                        topCustomers: [
                            { $group: { _id: '$user', total: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
                            { $sort: { total: -1 } },
                            { $limit: 10 }
                        ]
                    }
                }
            ]);

            // Populate course and user details
            if (stats[0]?.revenueByCourse?.length > 0) {
                const courseIds = stats[0].revenueByCourse.map(item => item._id);
                const courses = await Course.find({ _id: { $in: courseIds } }).select('title thumbnail');
                
                const courseMap = courses.reduce((map, course) => {
                    map[course._id.toString()] = course;
                    return map;
                }, {});

                stats[0].revenueByCourse = stats[0].revenueByCourse.map(item => ({
                    ...item,
                    course: courseMap[item._id.toString()] || { _id: item._id }
                }));
            }

            if (stats[0]?.topCustomers?.length > 0) {
                const userIds = stats[0].topCustomers.map(item => item._id);
                const users = await User.find({ _id: { $in: userIds } }).select('name email');
                
                const userMap = users.reduce((map, user) => {
                    map[user._id.toString()] = user;
                    return map;
                }, {});

                stats[0].topCustomers = stats[0].topCustomers.map(item => ({
                    ...item,
                    user: userMap[item._id.toString()] || { _id: item._id }
                }));
            }

            return stats[0] || {};
        } catch (error) {
            logger.error(`Get payment stats error: ${error.message}`);
            throw error;
        }
    }

    // Get referrer ID from referral code
    static async getReferrerId(referralCode) {
        try {
            const referrer = await User.findOne({ referralCode });
            return referrer ? referrer._id : null;
        } catch (error) {
            logger.error(`Get referrer error: ${error.message}`);
            return null;
        }
    }

    // Handle payment webhook
    static async handlePaymentWebhook(webhookData) {
        try {
            const { event, payload } = webhookData;

            switch (event) {
                case 'payment.captured':
                    // Handle successful payment
                    const payment = payload.payment.entity;
                    
                    // Find order by payment ID
                    const order = await Order.findOne({ razorpayPaymentId: payment.id });
                    if (order && order.paymentStatus === 'pending') {
                        order.paymentStatus = 'completed';
                        order.orderStatus = 'completed';
                        await order.save();

                        // Process enrollment
                        await this.processEnrollment(order._id);
                    }
                    break;

                case 'payment.failed':
                    // Handle failed payment
                    const failedPayment = payload.payment.entity;
                    
                    const failedOrder = await Order.findOne({ razorpayPaymentId: failedPayment.id });
                    if (failedOrder) {
                        failedOrder.paymentStatus = 'failed';
                        await failedOrder.save();
                    }
                    break;

                case 'refund.processed':
                    // Handle refund
                    const refund = payload.refund.entity;
                    
                    const refundedOrder = await Order.findOne({ razorpayPaymentId: refund.payment_id });
                    if (refundedOrder) {
                        refundedOrder.refundStatus = 'completed';
                        refundedOrder.refundAmount = refund.amount / 100;
                        refundedOrder.refundProcessedAt = new Date();
                        await refundedOrder.save();
                    }
                    break;

                default:
                    logger.info(`Unhandled webhook event: ${event}`);
            }

            return { success: true };
        } catch (error) {
            logger.error(`Handle webhook error: ${error.message}`);
            throw error;
        }
    }

    // Process enrollment after payment
    static async processEnrollment(orderId) {
        try {
            const order = await Order.findById(orderId)
                .populate('user')
                .populate('course');

            if (!order) {
                throw new Error('Order not found');
            }

            // Update course enrollments
            await Course.findByIdAndUpdate(order.course._id, {
                $inc: { totalEnrollments: 1 }
            });

            // Send enrollment email
            await sendEmail(order.user.email, 'courseEnrollment', {
                name: order.user.name,
                courseTitle: order.course.title
            });

            // Process affiliate commission
            if (order.referralUsed) {
                await AffiliateService.processCommission(orderId);
            }

            logger.info(`Enrollment processed for order: ${orderId}`);
        } catch (error) {
            logger.error(`Process enrollment error: ${error.message}`);
            throw error;
        }
    }

    // Cancel order
    static async cancelOrder(orderId, userId) {
        try {
            const order = await Order.findOne({
                _id: orderId,
                user: userId,
                paymentStatus: 'pending'
            });

            if (!order) {
                throw new Error('Order not found or cannot be cancelled');
            }

            order.orderStatus = 'cancelled';
            await order.save();

            logger.info(`Order cancelled: ${orderId} by user: ${userId}`);

            return {
                success: true,
                message: 'Order cancelled successfully'
            };
        } catch (error) {
            logger.error(`Cancel order error: ${error.message}`);
            throw error;
        }
    }

    // Add funds to wallet
    static async addFundsToWallet(userId, amount, paymentMethod) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create Razorpay order for wallet top-up
            const razorpayOrder = await razorpay.createOrder(
                amount,
                'INR',
                `wallet_topup_${Date.now()}`,
                {
                    userId: userId.toString(),
                    type: 'wallet_topup'
                }
            );

            // Create wallet transaction record
            const transaction = new Transaction({
                transactionId: `WT${Date.now()}${Math.floor(Math.random() * 1000)}`,
                user: userId,
                type: 'credit',
                amount: amount,
                description: `Wallet top-up via ${paymentMethod}`,
                referenceType: 'wallet_topup',
                status: 'pending',
                metadata: {
                    razorpayOrderId: razorpayOrder.id,
                    paymentMethod: paymentMethod
                }
            });

            await transaction.save();

            logger.info(`Wallet top-up initiated: ${transaction._id} for user: ${userId}`);

            return {
                transactionId: transaction._id,
                razorpayOrderId: razorpayOrder.id,
                amount: amount,
                key: process.env.RAZORPAY_KEY_ID
            };
        } catch (error) {
            logger.error(`Add funds to wallet error: ${error.message}`);
            throw error;
        }
    }

    // Verify and process wallet top-up
    static async verifyWalletTopup(transactionId, paymentData) {
        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Verify payment
            const verification = verifyRazorpayPayment(
                paymentData.razorpay_order_id,
                paymentData.razorpay_payment_id,
                paymentData.razorpay_signature
            );

            if (!verification.isValid) {
                transaction.status = 'failed';
                await transaction.save();
                throw new Error('Payment verification failed');
            }

            // Update transaction
            transaction.status = 'completed';
            transaction.metadata.razorpayPaymentId = paymentData.razorpay_payment_id;
            await transaction.save();

            // Update user wallet
            const user = await User.findById(transaction.user);
            if (user) {
                user.walletBalance += transaction.amount;
                await user.save({ validateBeforeSave: false });
            }

            // Update wallet balance
            const wallet = await Wallet.findOne({ user: transaction.user });
            if (wallet) {
                wallet.balance += transaction.amount;
                wallet.totalEarned += transaction.amount;
                wallet.lastTransactionAt = new Date();
                await wallet.save();
            }

            // Send confirmation email
            await sendEmail(user.email, 'walletTopup', {
                name: user.name,
                amount: transaction.amount,
                newBalance: user.walletBalance
            });

            logger.info(`Wallet top-up completed: ${transactionId} for user: ${transaction.user}`);

            return {
                success: true,
                amount: transaction.amount,
                newBalance: user.walletBalance
            };
        } catch (error) {
            logger.error(`Verify wallet top-up error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = PaymentService;