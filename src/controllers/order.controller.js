const OrderService = require('../services/order.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Create order
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId, paymentMethod, affiliateCode } = req.body;
        
        const order = await OrderService.createOrder(userId, courseId, paymentMethod, affiliateCode);
        ResponseHandler.sendSuccess(res, 'Order created successfully', order);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const order = await OrderService.getOrderById(id, userId);
        ResponseHandler.sendSuccess(res, 'Order retrieved', order);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20, status } = req.query;
        
        const filters = { status };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await OrderService.getUserOrders(userId, filters, pagination);
        ResponseHandler.sendPaginated(res, 'Orders retrieved', result.orders, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        
        const verifiedOrder = await OrderService.verifyPayment(orderId, paymentId, signature);
        ResponseHandler.sendSuccess(res, 'Payment verified successfully', verifiedOrder);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const order = await OrderService.cancelOrder(id, userId);
        ResponseHandler.sendSuccess(res, 'Order cancelled successfully', order);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Request refund
exports.requestRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { reason } = req.body;
        
        const refundRequest = await OrderService.requestRefund(id, userId, reason);
        ResponseHandler.sendSuccess(res, 'Refund requested successfully', refundRequest);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get order history
exports.getOrderHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;
        
        const history = await OrderService.getOrderHistory(userId, startDate, endDate);
        ResponseHandler.sendSuccess(res, 'Order history retrieved', history);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get order summary
exports.getOrderSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'monthly' } = req.query;
        
        const summary = await OrderService.getOrderSummary(userId, period);
        ResponseHandler.sendSuccess(res, 'Order summary retrieved', summary);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// ADMIN FUNCTIONS

// Get all orders (Admin)
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 50, status, startDate, endDate, userId } = req.query;
        const filters = { status, startDate, endDate, userId };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await OrderService.getAllOrders(filters, pagination);
        ResponseHandler.sendPaginated(res, 'All orders retrieved', result.orders, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get order details (Admin)
exports.getAdminOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await OrderService.getAdminOrderDetails(id);
        
        ResponseHandler.sendSuccess(res, 'Order details retrieved', order);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update order status (Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        
        const order = await OrderService.updateOrderStatus(id, status, remarks);
        ResponseHandler.sendSuccess(res, 'Order status updated', order);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Process refund (Admin)
exports.processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, reason } = req.body;
        
        const refund = await OrderService.processRefund(id, refundAmount, reason);
        ResponseHandler.sendSuccess(res, 'Refund processed', refund);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get sales analytics (Admin)
exports.getSalesAnalytics = async (req, res) => {
    try {
        const { period = 'daily', startDate, endDate } = req.query;
        const analytics = await OrderService.getSalesAnalytics(period, startDate, endDate);
        
        ResponseHandler.sendSuccess(res, 'Sales analytics retrieved', analytics);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get revenue report (Admin)
exports.getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate, format = 'excel' } = req.query;
        const report = await OrderService.getRevenueReport(startDate, endDate, format);
        
        ResponseHandler.sendSuccess(res, 'Revenue report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get top selling courses (Admin)
exports.getTopSellingCourses = async (req, res) => {
    try {
        const { period = 'monthly', limit = 10 } = req.query;
        const courses = await OrderService.getTopSellingCourses(period, parseInt(limit));
        
        ResponseHandler.sendSuccess(res, 'Top selling courses retrieved', courses);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get order statistics (Admin)
exports.getOrderStatistics = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const stats = await OrderService.getOrderStatistics(period);
        
        ResponseHandler.sendSuccess(res, 'Order statistics retrieved', stats);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};