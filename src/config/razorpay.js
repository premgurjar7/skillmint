const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET'
});

// Verify payment signature
const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    try {
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        
        const isValid = expectedSignature === razorpay_signature;
        
        if (!isValid) {
            logger.warn(`Payment verification failed for order: ${razorpay_order_id}`);
        }
        
        return isValid;
    } catch (error) {
        logger.error(`Error verifying payment: ${error.message}`);
        throw error;
    }
};

// Create Razorpay order
const createOrder = async (amount, currency = 'INR', receipt = null, notes = {}) => {
    try {
        const options = {
            amount: amount * 100, // Convert to paise
            currency: currency,
            receipt: receipt || `receipt_${Date.now()}`,
            notes: notes,
            payment_capture: 1 // Auto capture payment
        };
        
        const order = await razorpay.orders.create(options);
        logger.info(`Razorpay order created: ${order.id}`);
        
        return {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
            createdAt: order.created_at
        };
    } catch (error) {
        logger.error(`Error creating Razorpay order: ${error.message}`);
        throw error;
    }
};

// Fetch payment details
const getPaymentDetails = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        logger.error(`Error fetching payment details: ${error.message}`);
        throw error;
    }
};

// Refund payment
const refundPayment = async (paymentId, amount, notes = {}) => {
    try {
        const refund = await razorpay.payments.refund(paymentId, {
            amount: amount * 100, // Convert to paise
            notes: notes
        });
        
        logger.info(`Refund processed: ${refund.id} for payment: ${paymentId}`);
        return refund;
    } catch (error) {
        logger.error(`Error processing refund: ${error.message}`);
        throw error;
    }
};

// Fetch refund details
const getRefundDetails = async (refundId) => {
    try {
        const refund = await razorpay.refunds.fetch(refundId);
        return refund;
    } catch (error) {
        logger.error(`Error fetching refund details: ${error.message}`);
        throw error;
    }
};

// Fetch order details
const getOrderDetails = async (orderId) => {
    try {
        const order = await razorpay.orders.fetch(orderId);
        return order;
    } catch (error) {
        logger.error(`Error fetching order details: ${error.message}`);
        throw error;
    }
};

// Capture payment (for manual capture)
const capturePayment = async (paymentId, amount) => {
    try {
        const capture = await razorpay.payments.capture(paymentId, amount * 100);
        return capture;
    } catch (error) {
        logger.error(`Error capturing payment: ${error.message}`);
        throw error;
    }
};

// Get payments by order ID
const getPaymentsByOrder = async (orderId) => {
    try {
        const payments = await razorpay.orders.fetchPayments(orderId);
        return payments;
    } catch (error) {
        logger.error(`Error fetching payments by order: ${error.message}`);
        throw error;
    }
};

// Webhook verification
const verifyWebhookSignature = (body, signature, webhookSecret) => {
    try {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(body))
            .digest('hex');
        
        return expectedSignature === signature;
    } catch (error) {
        logger.error(`Error verifying webhook signature: ${error.message}`);
        return false;
    }
};

// Generate payment link
const createPaymentLink = async (params) => {
    try {
        const paymentLink = await razorpay.paymentLink.create({
            amount: params.amount * 100,
            currency: params.currency || 'INR',
            accept_partial: params.acceptPartial || false,
            first_min_partial_amount: params.firstMinPartialAmount || 0,
            description: params.description || 'Course Purchase',
            customer: {
                name: params.customerName,
                email: params.customerEmail,
                contact: params.customerPhone
            },
            notify: {
                sms: params.notifySMS || true,
                email: params.notifyEmail || true
            },
            reminder_enable: params.reminderEnable || true,
            notes: params.notes || {},
            callback_url: params.callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
            callback_method: params.callbackMethod || 'get'
        });
        
        return paymentLink;
    } catch (error) {
        logger.error(`Error creating payment link: ${error.message}`);
        throw error;
    }
};

module.exports = {
    razorpay,
    verifyPayment,
    createOrder,
    getPaymentDetails,
    refundPayment,
    getRefundDetails,
    getOrderDetails,
    capturePayment,
    getPaymentsByOrder,
    verifyWebhookSignature,
    createPaymentLink
};