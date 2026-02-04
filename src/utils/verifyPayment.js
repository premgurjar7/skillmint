const crypto = require('crypto');
const razorpayConfig = require('../config/razorpay');
const logger = require('./logger');

const verifyRazorpayPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    try {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error('Missing payment verification parameters');
        }
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        
        const isValid = expectedSignature === razorpay_signature;
        
        if (!isValid) {
            logger.warn(`Payment verification failed for order: ${razorpay_order_id}`);
        } else {
            logger.info(`Payment verified successfully for order: ${razorpay_order_id}`);
        }
        
        return {
            isValid,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        };
    } catch (error) {
        logger.error(`Error verifying Razorpay payment: ${error.message}`);
        throw error;
    }
};

const verifyWalletPayment = async (userId, amount, orderId) => {
    try {
        const { Wallet } = require('../models/Wallet.model');
        
        if (!userId || !amount || !orderId) {
            throw new Error('Missing wallet payment verification parameters');
        }
        
        // Check if wallet exists and has sufficient balance
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            return {
                isValid: false,
                message: 'Wallet not found',
                code: 'WALLET_NOT_FOUND'
            };
        }
        
        if (wallet.balance < amount) {
            return {
                isValid: false,
                message: 'Insufficient wallet balance',
                code: 'INSUFFICIENT_BALANCE',
                balance: wallet.balance,
                required: amount
            };
        }
        
        // Check if order already processed
        const { Order } = require('../models/Order.model');
        const existingOrder = await Order.findOne({ 
            orderId: orderId,
            paymentStatus: 'completed' 
        });
        
        if (existingOrder) {
            return {
                isValid: false,
                message: 'Order already processed',
                code: 'ORDER_ALREADY_PROCESSED'
            };
        }
        
        return {
            isValid: true,
            message: 'Wallet payment verification successful',
            code: 'VERIFICATION_SUCCESS',
            walletBalance: wallet.balance
        };
    } catch (error) {
        logger.error(`Error verifying wallet payment: ${error.message}`);
        throw error;
    }
};

const verifyCouponCode = async (couponCode, userId, courseId) => {
    try {
        // In a real application, you would have a Coupon model
        // This is a simplified version
        const { Coupon } = require('../models/Coupon.model') || {};
        
        if (!couponCode) {
            return {
                isValid: false,
                message: 'Coupon code is required',
                code: 'NO_COUPON'
            };
        }
        
        // Mock coupon validation - replace with actual database query
        const validCoupons = {
            'WELCOME10': { discount: 10, type: 'percentage', minAmount: 0 },
            'FIRST50': { discount: 50, type: 'fixed', minAmount: 500 },
            'SKILLMINT20': { discount: 20, type: 'percentage', minAmount: 1000 }
        };
        
        const coupon = validCoupons[couponCode.toUpperCase()];
        
        if (!coupon) {
            return {
                isValid: false,
                message: 'Invalid coupon code',
                code: 'INVALID_COUPON'
            };
        }
        
        // Check if coupon is expired (simplified)
        // In real app, check expiry date from database
        const isExpired = false; // Replace with actual expiry check
        
        if (isExpired) {
            return {
                isValid: false,
                message: 'Coupon code has expired',
                code: 'EXPIRED_COUPON'
            };
        }
        
        // Check if user has used this coupon before
        // In real app, check usage history
        const hasUsed = false; // Replace with actual usage check
        
        if (hasUsed) {
            return {
                isValid: false,
                message: 'Coupon code already used',
                code: 'COUPON_USED'
            };
        }
        
        return {
            isValid: true,
            message: 'Coupon code is valid',
            code: 'COUPON_VALID',
            coupon: {
                code: couponCode.toUpperCase(),
                discount: coupon.discount,
                type: coupon.type,
                minAmount: coupon.minAmount
            }
        };
    } catch (error) {
        logger.error(`Error verifying coupon code: ${error.message}`);
        return {
            isValid: false,
            message: 'Error verifying coupon code',
            code: 'VERIFICATION_ERROR'
        };
    }
};

const calculateDiscount = (originalAmount, coupon) => {
    try {
        if (!coupon || !coupon.isValid) {
            return {
                discountedAmount: originalAmount,
                discountAmount: 0,
                discountPercentage: 0
            };
        }
        
        let discountAmount = 0;
        
        if (coupon.type === 'percentage') {
            // Check minimum amount requirement
            if (originalAmount < coupon.minAmount) {
                return {
                    discountedAmount: originalAmount,
                    discountAmount: 0,
                    discountPercentage: 0,
                    message: `Minimum amount of ₹${coupon.minAmount} required for this coupon`
                };
            }
            
            discountAmount = (originalAmount * coupon.discount) / 100;
            // Cap discount if there's a max discount
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else if (coupon.type === 'fixed') {
            discountAmount = coupon.discount;
            // Ensure discount doesn't exceed original amount
            if (discountAmount > originalAmount) {
                discountAmount = originalAmount;
            }
        }
        
        const discountedAmount = originalAmount - discountAmount;
        const discountPercentage = (discountAmount / originalAmount) * 100;
        
        return {
            discountedAmount,
            discountAmount,
            discountPercentage: Math.round(discountPercentage * 100) / 100,
            couponApplied: coupon.code
        };
    } catch (error) {
        logger.error(`Error calculating discount: ${error.message}`);
        throw error;
    }
};

const verifyPaymentWebhook = (body, signature) => {
    try {
        if (!body || !signature) {
            throw new Error('Missing webhook verification parameters');
        }
        
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        
        if (!webhookSecret) {
            throw new Error('Webhook secret not configured');
        }
        
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');
        
        const isValid = expectedSignature === signature;
        
        if (!isValid) {
            logger.warn(`Webhook signature verification failed`);
        } else {
            logger.info(`Webhook signature verified successfully`);
        }
        
        return {
            isValid,
            event: body.event,
            payload: body.payload
        };
    } catch (error) {
        logger.error(`Error verifying payment webhook: ${error.message}`);
        throw error;
    }
};

const verifyBankTransfer = (transferDetails) => {
    try {
        // This is a simplified version
        // In real application, integrate with bank APIs
        
        const { accountNumber, ifscCode, amount, reference } = transferDetails;
        
        if (!accountNumber || !ifscCode || !amount || !reference) {
            return {
                isValid: false,
                message: 'Missing bank transfer details',
                code: 'MISSING_DETAILS'
            };
        }
        
        // Validate account number (Indian account numbers are usually 9-18 digits)
        const accountNumberRegex = /^\d{9,18}$/;
        if (!accountNumberRegex.test(accountNumber)) {
            return {
                isValid: false,
                message: 'Invalid account number',
                code: 'INVALID_ACCOUNT'
            };
        }
        
        // Validate IFSC code (format: ABCD0123456)
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifscCode.toUpperCase())) {
            return {
                isValid: false,
                message: 'Invalid IFSC code',
                code: 'INVALID_IFSC'
            };
        }
        
        // Validate amount
        if (amount < 100 || amount > 100000) {
            return {
                isValid: false,
                message: 'Amount must be between ₹100 and ₹100,000',
                code: 'INVALID_AMOUNT'
            };
        }
        
        // Simulate bank verification (in real app, call bank API)
        const isBankVerified = true; // Replace with actual bank verification
        
        if (!isBankVerified) {
            return {
                isValid: false,
                message: 'Bank account verification failed',
                code: 'BANK_VERIFICATION_FAILED'
            };
        }
        
        return {
            isValid: true,
            message: 'Bank transfer details verified',
            code: 'VERIFICATION_SUCCESS',
            transferDetails: {
                accountNumber: accountNumber.replace(/.(?=.{4})/g, '*'), // Mask account number
                ifscCode,
                amount,
                reference,
                verifiedAt: new Date()
            }
        };
    } catch (error) {
        logger.error(`Error verifying bank transfer: ${error.message}`);
        throw error;
    }
};

const verifyUPIPayment = (upiDetails) => {
    try {
        const { upiId, amount, transactionNote } = upiDetails;
        
        if (!upiId || !amount) {
            return {
                isValid: false,
                message: 'Missing UPI payment details',
                code: 'MISSING_DETAILS'
            };
        }
        
        // Validate UPI ID format
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(upiId)) {
            return {
                isValid: false,
                message: 'Invalid UPI ID format',
                code: 'INVALID_UPI_ID'
            };
        }
        
        // Validate amount
        if (amount < 1 || amount > 100000) {
            return {
                isValid: false,
                message: 'Amount must be between ₹1 and ₹100,000',
                code: 'INVALID_AMOUNT'
            };
        }
        
        // Check if UPI ID is from supported banks
        const supportedBanks = ['okaxis', 'okhdfcbank', 'okicici', 'oksbi', 'paytm', 'phonepe', 'gpay'];
        const bank = upiId.split('@')[1].toLowerCase();
        
        if (!supportedBanks.some(supported => bank.includes(supported))) {
            logger.warn(`UPI payment from unsupported bank: ${bank}`);
        }
        
        return {
            isValid: true,
            message: 'UPI payment details verified',
            code: 'VERIFICATION_SUCCESS',
            upiDetails: {
                upiId,
                amount,
                transactionNote,
                verifiedAt: new Date()
            }
        };
    } catch (error) {
        logger.error(`Error verifying UPI payment: ${error.message}`);
        throw error;
    }
};

const verifyPaymentStatus = async (paymentId, paymentMethod = 'razorpay') => {
    try {
        if (!paymentId) {
            throw new Error('Payment ID is required');
        }
        
        switch (paymentMethod.toLowerCase()) {
            case 'razorpay':
                const payment = await razorpayConfig.getPaymentDetails(paymentId);
                return {
                    status: payment.status,
                    amount: payment.amount / 100, // Convert from paise to rupees
                    currency: payment.currency,
                    method: payment.method,
                    captured: payment.captured,
                    refundStatus: payment.refund_status,
                    createdAt: new Date(payment.created_at * 1000)
                };
                
            case 'wallet':
                // For wallet payments, check transaction status
                const { Transaction } = require('../models/Wallet.model');
                const transaction = await Transaction.findOne({ transactionId: paymentId });
                
                if (!transaction) {
                    return {
                        status: 'not_found',
                        message: 'Transaction not found'
                    };
                }
                
                return {
                    status: transaction.status,
                    amount: transaction.amount,
                    type: transaction.type,
                    description: transaction.description,
                    createdAt: transaction.createdAt
                };
                
            default:
                throw new Error(`Unsupported payment method: ${paymentMethod}`);
        }
    } catch (error) {
        logger.error(`Error verifying payment status: ${error.message}`);
        throw error;
    }
};

module.exports = {
    verifyRazorpayPayment,
    verifyWalletPayment,
    verifyCouponCode,
    calculateDiscount,
    verifyPaymentWebhook,
    verifyBankTransfer,
    verifyUPIPayment,
    verifyPaymentStatus
};