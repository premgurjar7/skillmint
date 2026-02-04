const express = require('express');
const router = express.Router();
const PaymentService = require('../services/payment.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const authValidation = require('../validations/auth.validation');
const courseValidation = require('../validations/course.validation');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post(
    '/',
    authenticate,
    validate(courseValidation.createOrder),
    async (req, res) => {
        try {
            const { courseId, referralCode, couponCode, paymentMethod = 'razorpay' } = req.body;
            
            const orderData = {
                userId: req.user._id,
                courseId,
                referralCode,
                couponCode,
                paymentMethod,
                userName: req.user.name,
                userEmail: req.user.email,
                userPhone: req.user.phone,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                device: req.headers['device'] || 'web'
            };
            
            let result;
            
            if (paymentMethod === 'wallet') {
                // Process wallet payment
                result = await PaymentService.processWalletPayment(orderData);
            } else {
                // Create Razorpay order for other payment methods
                result = await PaymentService.createRazorpayOrder(orderData);
            }
            
            ResponseHandler.sendCreated(res, 'Order created successfully', result);
        } catch (error) {
            logger.error(`Create order error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/orders/verify
// @desc    Verify payment
// @access  Public
router.post(
    '/verify',
    validate(authValidation.verifyPayment),
    async (req, res) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            
            const result = await PaymentService.verifyRazorpayPayment({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });
            
            ResponseHandler.sendSuccess(res, 'Payment verified successfully', result);
        } catch (error) {
            logger.error(`Verify payment error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get(
    '/',
    authenticate,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, status, paymentStatus, search } = req.query;
            
            const filters = { status, paymentStatus, search };
            const pagination = { 
                page: parseInt(page), 
                limit: parseInt(limit),
                sortBy: '-createdAt'
            };
            
            const result = await PaymentService.getUserOrders(req.user._id, filters, pagination);
            ResponseHandler.sendPaginated(res, 'Orders retrieved successfully', result.orders, result.pagination);
        } catch (error) {
            logger.error(`Get orders error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get(
    '/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const order = await PaymentService.getOrderById(id, req.user._id);
            
            ResponseHandler.sendSuccess(res, 'Order retrieved successfully', order);
        } catch (error) {
            logger.error(`Get order error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.post(
    '/:id/cancel',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await PaymentService.cancelOrder(id, req.user._id);
            
            ResponseHandler.sendSuccess(res, 'Order cancelled successfully', result);
        } catch (error) {
            logger.error(`Cancel order error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/orders/:id/refund
// @desc    Request refund
// @access  Private
router.post(
    '/:id/refund',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, reason } = req.body;
            
            const result = await PaymentService.processRefund(id, amount, reason);
            ResponseHandler.sendSuccess(res, 'Refund requested successfully', result);
        } catch (error) {
            logger.error(`Request refund error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/orders/:id/receipt
// @desc    Get order receipt
// @access  Private
router.get(
    '/:id/receipt',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const order = await PaymentService.getOrderById(id, req.user._id);
            
            if (!order) {
                return ResponseHandler.sendNotFound(res, 'Order not found');
            }
            
            const receipt = {
                orderId: order.orderId,
                date: order.createdAt,
                user: {
                    name: order.user?.name || req.user.name,
                    email: order.user?.email || req.user.email
                },
                course: {
                    title: order.course?.title || 'Course',
                    price: order.amount,
                    discount: order.discount || 0,
                    finalAmount: order.finalAmount
                },
                payment: {
                    method: order.paymentMethod,
                    status: order.paymentStatus,
                    transactionId: order.razorpayPaymentId
                },
                invoiceNumber: `INV-${order.orderId}`,
                receiptNumber: `RCP-${order.orderId}`
            };
            
            ResponseHandler.sendSuccess(res, 'Receipt retrieved', receipt);
        } catch (error) {
            logger.error(`Get receipt error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/orders/webhook
// @desc    Razorpay webhook handler
// @access  Public
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        try {
            const webhookSignature = req.headers['x-razorpay-signature'];
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
            
            // Verify webhook signature
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(req.body)
                .digest('hex');
            
            if (expectedSignature !== webhookSignature) {
                logger.error('Webhook signature verification failed');
                return res.status(400).json({ success: false, message: 'Invalid signature' });
            }
            
            const webhookData = JSON.parse(req.body);
            await PaymentService.handlePaymentWebhook(webhookData);
            
            res.json({ success: true });
        } catch (error) {
            logger.error(`Webhook error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// @route   GET /api/orders/stats/overview
// @desc    Get orders overview statistics
// @access  Private/Admin
router.get(
    '/stats/overview',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { startDate, endDate, groupBy = 'daily' } = req.query;
            
            const stats = await PaymentService.getPaymentStats(null, groupBy);
            ResponseHandler.sendSuccess(res, 'Orders overview stats', stats);
        } catch (error) {
            logger.error(`Get orders overview stats error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/orders
// @desc    Get all orders (Admin only)
// @access  Private/Admin
router.get(
    '/admin/orders',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 20, 
                userId, 
                courseId, 
                status, 
                paymentStatus,
                startDate,
                endDate,
                search
            } = req.query;
            
            const { Order } = require('../config/db');
            
            const query = {};
            
            if (userId) query.user = userId;
            if (courseId) query.course = courseId;
            if (status) query.orderStatus = status;
            if (paymentStatus) query.paymentStatus = paymentStatus;
            
            // Date range filter
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }
            
            // Search by order ID, user name, or course title
            if (search) {
                const users = await User.find({
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                }).select('_id');
                
                const courses = await Course.find({
                    title: { $regex: search, $options: 'i' }
                }).select('_id');
                
                query.$or = [
                    { orderId: { $regex: search, $options: 'i' } },
                    { user: { $in: users.map(u => u._id) } },
                    { course: { $in: courses.map(c => c._id) } }
                ];
            }
            
            const skip = (page - 1) * limit;
            
            const orders = await Order.find(query)
                .populate('user', 'name email')
                .populate('course', 'title thumbnail')
                .populate('referralUsed', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await Order.countDocuments(query);
            
            ResponseHandler.sendPaginated(res, 'All orders retrieved', orders, {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error) {
            logger.error(`Get all orders error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private/Admin
router.put(
    '/admin/orders/:id/status',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status, adminNotes } = req.body;
            
            const { Order } = require('../config/db');
            
            const order = await Order.findById(id);
            if (!order) {
                return ResponseHandler.sendNotFound(res, 'Order not found');
            }
            
            order.orderStatus = status;
            if (adminNotes) {
                order.adminNotes = adminNotes;
            }
            
            await order.save();
            
            logger.info(`Order status updated: ${id} -> ${status} by admin ${req.user._id}`);
            
            ResponseHandler.sendSuccess(res, 'Order status updated', order);
        } catch (error) {
            logger.error(`Update order status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/orders/wallet/topup
// @desc    Add funds to wallet
// @access  Private
router.post(
    '/wallet/topup',
    authenticate,
    async (req, res) => {
        try {
            const { amount, paymentMethod = 'razorpay' } = req.body;
            
            if (!amount || amount < 100) {
                return ResponseHandler.sendBadRequest(res, 'Minimum amount is ₹100');
            }
            
            if (amount > 50000) {
                return ResponseHandler.sendBadRequest(res, 'Maximum amount is ₹50,000');
            }
            
            const result = await PaymentService.addFundsToWallet(
                req.user._id,
                amount,
                paymentMethod
            );
            
            ResponseHandler.sendSuccess(res, 'Wallet top-up initiated', result);
        } catch (error) {
            logger.error(`Wallet top-up error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/orders/wallet/verify-topup
// @desc    Verify wallet top-up
// @access  Private
router.post(
    '/wallet/verify-topup',
    authenticate,
    async (req, res) => {
        try {
            const { transactionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            
            const result = await PaymentService.verifyWalletTopup(
                transactionId,
                {
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature
                }
            );
            
            ResponseHandler.sendSuccess(res, 'Wallet top-up verified', result);
        } catch (error) {
            logger.error(`Verify wallet top-up error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/orders/analytics/revenue
// @desc    Get revenue analytics
// @access  Private/Admin
router.get(
    '/analytics/revenue',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { timeframe = 'monthly', startDate, endDate } = req.query;
            
            const stats = await PaymentService.getPaymentStats(null, timeframe);
            
            // Additional revenue analytics
            const { Order } = require('../config/db');
            
            const revenueByCourse = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'completed',
                        createdAt: {
                            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                        }
                    }
                },
                {
                    $group: {
                        _id: '$course',
                        totalRevenue: { $sum: '$finalAmount' },
                        totalOrders: { $sum: 1 }
                    }
                },
                { $sort: { totalRevenue: -1 } },
                { $limit: 10 }
            ]);
            
            // Populate course details
            const courseIds = revenueByCourse.map(item => item._id);
            const courses = await Course.find({ _id: { $in: courseIds } })
                .select('title thumbnail instructor');
            
            const courseMap = courses.reduce((acc, course) => {
                acc[course._id.toString()] = course;
                return acc;
            }, {});
            
            const revenueByCourseWithDetails = revenueByCourse.map(item => ({
                ...item,
                course: courseMap[item._id.toString()] || { _id: item._id }
            }));
            
            ResponseHandler.sendSuccess(res, 'Revenue analytics', {
                overview: stats,
                topCourses: revenueByCourseWithDetails
            });
        } catch (error) {
            logger.error(`Get revenue analytics error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/my-orders/summary
// @desc    Get user's orders summary
// @access  Private
router.get(
    '/my-orders/summary',
    authenticate,
    async (req, res) => {
        try {
            const { Order } = require('../config/db');
            
            const summary = await Order.aggregate([
                {
                    $match: {
                        user: req.user._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$finalAmount' },
                        completedOrders: {
                            $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] }
                        },
                        pendingOrders: {
                            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
                        },
                        failedOrders: {
                            $sum: { $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0] }
                        },
                        avgOrderValue: { $avg: '$finalAmount' }
                    }
                }
            ]);
            
            // Get recent orders
            const recentOrders = await Order.find({ user: req.user._id })
                .populate('course', 'title thumbnail')
                .sort({ createdAt: -1 })
                .limit(5);
            
            ResponseHandler.sendSuccess(res, 'Orders summary', {
                summary: summary[0] || {
                    totalOrders: 0,
                    totalSpent: 0,
                    completedOrders: 0,
                    pendingOrders: 0,
                    failedOrders: 0,
                    avgOrderValue: 0
                },
                recentOrders
            });
        } catch (error) {
            logger.error(`Get orders summary error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;