const AdminService = require('../services/admin.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await AdminService.getDashboardStats();
        ResponseHandler.sendSuccess(res, 'Dashboard stats retrieved', stats);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, status } = req.query;
        const filters = { search, role, status };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getAllUsers(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Users retrieved', result.users, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await AdminService.getUserById(id);
        
        ResponseHandler.sendSuccess(res, 'User details retrieved', user);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userData = req.body;
        
        const user = await AdminService.updateUser(id, userData);
        ResponseHandler.sendSuccess(res, 'User updated successfully', user);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        
        const user = await AdminService.updateUserStatus(id, { status, reason });
        ResponseHandler.sendSuccess(res, 'User status updated', user);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await AdminService.deleteUser(id);
        
        ResponseHandler.sendSuccess(res, 'User deleted successfully');
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, category, instructorId, status } = req.query;
        const filters = { search, category, instructorId, status };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getAllCourses(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Courses retrieved', result.courses, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update course approval
exports.updateCourseApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        
        const course = await AdminService.updateCourseApproval(id, { status, remarks });
        ResponseHandler.sendSuccess(res, 'Course approval updated', course);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate, userId } = req.query;
        const filters = { status, startDate, endDate, userId };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getAllOrders(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Orders retrieved', result.orders, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await AdminService.getOrderDetails(id);
        
        ResponseHandler.sendSuccess(res, 'Order details retrieved', order);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Process refund
exports.processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, reason } = req.body;
        
        const refund = await AdminService.processRefund(id, refundAmount, reason);
        ResponseHandler.sendSuccess(res, 'Refund processed', refund);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal requests
exports.getWithdrawalRequests = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, affiliateId } = req.query;
        const filters = { status, affiliateId };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getWithdrawalRequests(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Withdrawal requests retrieved', result.requests, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update withdrawal status
exports.updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        
        const withdrawal = await AdminService.updateWithdrawalStatus(id, { status, remarks });
        ResponseHandler.sendSuccess(res, 'Withdrawal status updated', withdrawal);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 50, type, startDate, endDate } = req.query;
        const filters = { type, startDate, endDate };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getAllTransactions(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Transactions retrieved', result.transactions, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get revenue report
exports.getRevenueReport = async (req, res) => {
    try {
        const { period = 'monthly', startDate, endDate } = req.query;
        const report = await AdminService.getRevenueReport(period, startDate, endDate);
        
        ResponseHandler.sendSuccess(res, 'Revenue report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get sales report
exports.getSalesReport = async (req, res) => {
    try {
        const { period = 'daily', startDate, endDate, courseId } = req.query;
        const report = await AdminService.getSalesReport(period, startDate, endDate, courseId);
        
        ResponseHandler.sendSuccess(res, 'Sales report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get affiliate report
exports.getAffiliateReport = async (req, res) => {
    try {
        const { startDate, endDate, affiliateId } = req.query;
        const report = await AdminService.getAffiliateReport(startDate, endDate, affiliateId);
        
        ResponseHandler.sendSuccess(res, 'Affiliate report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get analytics overview
exports.getAnalyticsOverview = async (req, res) => {
    try {
        const analytics = await AdminService.getAnalyticsOverview();
        ResponseHandler.sendSuccess(res, 'Analytics overview retrieved', analytics);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get user growth analytics
exports.getUserGrowthAnalytics = async (req, res) => {
    try {
        const { period = 'monthly', startDate, endDate } = req.query;
        const analytics = await AdminService.getUserGrowthAnalytics(period, startDate, endDate);
        
        ResponseHandler.sendSuccess(res, 'User growth analytics retrieved', analytics);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Create announcement
exports.createAnnouncement = async (req, res) => {
    try {
        const announcementData = req.body;
        const announcement = await AdminService.createAnnouncement(announcementData);
        
        ResponseHandler.sendSuccess(res, 'Announcement created', announcement);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const { status } = req.query;
        const { page = 1, limit = 20 } = req.query;
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getAnnouncements(status, pagination);
        ResponseHandler.sendPaginated(res, 'Announcements retrieved', result.announcements, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update announcement
exports.updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const announcementData = req.body;
        
        const announcement = await AdminService.updateAnnouncement(id, announcementData);
        ResponseHandler.sendSuccess(res, 'Announcement updated', announcement);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await AdminService.deleteAnnouncement(id);
        
        ResponseHandler.sendSuccess(res, 'Announcement deleted');
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get platform settings
exports.getPlatformSettings = async (req, res) => {
    try {
        const settings = await AdminService.getPlatformSettings();
        ResponseHandler.sendSuccess(res, 'Platform settings retrieved', settings);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update platform settings
exports.updatePlatformSettings = async (req, res) => {
    try {
        const settings = req.body;
        const updatedSettings = await AdminService.updatePlatformSettings(settings);
        
        ResponseHandler.sendSuccess(res, 'Platform settings updated', updatedSettings);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get system logs
exports.getSystemLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, type, startDate, endDate } = req.query;
        const filters = { type, startDate, endDate };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AdminService.getSystemLogs(filters, pagination);
        ResponseHandler.sendPaginated(res, 'System logs retrieved', result.logs, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Trigger backup
exports.triggerBackup = async (req, res) => {
    try {
        const backup = await AdminService.triggerBackup();
        ResponseHandler.sendSuccess(res, 'Backup triggered successfully', backup);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get backup history
exports.getBackupHistory = async (req, res) => {
    try {
        const backups = await AdminService.getBackupHistory();
        ResponseHandler.sendSuccess(res, 'Backup history retrieved', backups);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Bulk user actions
exports.bulkUserActions = async (req, res) => {
    try {
        const { action, userIds, data } = req.body;
        const result = await AdminService.bulkUserActions(action, userIds, data);
        
        ResponseHandler.sendSuccess(res, 'Bulk action completed', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get dashboard widgets
exports.getDashboardWidgets = async (req, res) => {
    try {
        const widgets = await AdminService.getDashboardWidgets();
        ResponseHandler.sendSuccess(res, 'Dashboard widgets retrieved', widgets);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};