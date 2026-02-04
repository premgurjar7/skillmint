const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const adminValidation = require('../validations/admin.validation');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Private/Admin
router.get(
    '/dashboard',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await AdminController.getDashboardStats();
            ResponseHandler.sendSuccess(res, 'Dashboard stats retrieved', result);
        } catch (error) {
            logger.error(`Dashboard error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private/Admin
router.get(
    '/users',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getUsers, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, role, status } = req.query;
            const filters = { search, role, status };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getAllUsers(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Users retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get users error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/users/:id
// @desc    Get user details by ID
// @access  Private/Admin
router.get(
    '/users/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.getUserById(id);
            ResponseHandler.sendSuccess(res, 'User details retrieved', result);
        } catch (error) {
            logger.error(`Get user error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/users/:id
// @desc    Update user details
// @access  Private/Admin
router.put(
    '/users/:id',
    authenticate,
    authorize('admin'),
    validate(adminValidation.updateUser),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.updateUser(id, req.body);
            ResponseHandler.sendSuccess(res, 'User updated successfully', result);
        } catch (error) {
            logger.error(`Update user error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (active/suspended)
// @access  Private/Admin
router.put(
    '/users/:id/status',
    authenticate,
    authorize('admin'),
    validate(adminValidation.updateUserStatus),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.updateUserStatus(id, req.body);
            ResponseHandler.sendSuccess(res, 'User status updated', result);
        } catch (error) {
            logger.error(`Update user status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user account
// @access  Private/Admin
router.delete(
    '/users/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.deleteUser(id);
            ResponseHandler.sendSuccess(res, 'User deleted successfully', result);
        } catch (error) {
            logger.error(`Delete user error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/courses
// @desc    Get all courses with filters
// @access  Private/Admin
router.get(
    '/courses',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getCourses, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, category, instructorId, status } = req.query;
            const filters = { search, category, instructorId, status };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getAllCourses(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Courses retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/courses/:id/approval
// @desc    Approve/reject course
// @access  Private/Admin
router.put(
    '/courses/:id/approval',
    authenticate,
    authorize('admin'),
    validate(adminValidation.updateCourseApproval),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.updateCourseApproval(id, req.body);
            ResponseHandler.sendSuccess(res, 'Course approval updated', result);
        } catch (error) {
            logger.error(`Course approval error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private/Admin
router.get(
    '/orders',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getOrders, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status, startDate, endDate, userId } = req.query;
            const filters = { status, startDate, endDate, userId };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getAllOrders(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Orders retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get orders error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/orders/:id
// @desc    Get order details
// @access  Private/Admin
router.get(
    '/orders/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.getOrderDetails(id);
            ResponseHandler.sendSuccess(res, 'Order details retrieved', result);
        } catch (error) {
            logger.error(`Get order error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/orders/:id/refund
// @desc    Process order refund
// @access  Private/Admin
router.put(
    '/orders/:id/refund',
    authenticate,
    authorize('admin'),
    validate(adminValidation.processRefund),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.processRefund(id, req.body);
            ResponseHandler.sendSuccess(res, 'Refund processed', result);
        } catch (error) {
            logger.error(`Process refund error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/withdrawals
// @desc    Get all withdrawal requests
// @access  Private/Admin
router.get(
    '/withdrawals',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getWithdrawals, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status, affiliateId } = req.query;
            const filters = { status, affiliateId };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getWithdrawalRequests(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Withdrawal requests retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get withdrawals error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/withdrawals/:id/status
// @desc    Update withdrawal request status
// @access  Private/Admin
router.put(
    '/withdrawals/:id/status',
    authenticate,
    authorize('admin'),
    validate(adminValidation.updateWithdrawalStatus),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.updateWithdrawalStatus(id, req.body);
            ResponseHandler.sendSuccess(res, 'Withdrawal status updated', result);
        } catch (error) {
            logger.error(`Update withdrawal status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/transactions
// @desc    Get all financial transactions
// @access  Private/Admin
router.get(
    '/transactions',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getTransactions, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, type, startDate, endDate } = req.query;
            const filters = { type, startDate, endDate };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getAllTransactions(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Transactions retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get transactions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/reports/revenue
// @desc    Get revenue reports
// @access  Private/Admin
router.get(
    '/reports/revenue',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getRevenueReport, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly', startDate, endDate } = req.query;
            const result = await AdminController.getRevenueReport(period, startDate, endDate);
            ResponseHandler.sendSuccess(res, 'Revenue report generated', result);
        } catch (error) {
            logger.error(`Revenue report error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/reports/sales
// @desc    Get sales reports
// @access  Private/Admin
router.get(
    '/reports/sales',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getSalesReport, ['query']),
    async (req, res) => {
        try {
            const { period = 'daily', startDate, endDate, courseId } = req.query;
            const result = await AdminController.getSalesReport(period, startDate, endDate, courseId);
            ResponseHandler.sendSuccess(res, 'Sales report generated', result);
        } catch (error) {
            logger.error(`Sales report error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/reports/affiliate
// @desc    Get affiliate performance report
// @access  Private/Admin
router.get(
    '/reports/affiliate',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getAffiliateReport, ['query']),
    async (req, res) => {
        try {
            const { startDate, endDate, affiliateId } = req.query;
            const result = await AdminController.getAffiliateReport(startDate, endDate, affiliateId);
            ResponseHandler.sendSuccess(res, 'Affiliate report generated', result);
        } catch (error) {
            logger.error(`Affiliate report error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/analytics/overview
// @desc    Get platform analytics overview
// @access  Private/Admin
router.get(
    '/analytics/overview',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await AdminController.getAnalyticsOverview();
            ResponseHandler.sendSuccess(res, 'Analytics overview retrieved', result);
        } catch (error) {
            logger.error(`Analytics overview error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/analytics/user-growth
// @desc    Get user growth analytics
// @access  Private/Admin
router.get(
    '/analytics/user-growth',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getUserGrowth, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly', startDate, endDate } = req.query;
            const result = await AdminController.getUserGrowthAnalytics(period, startDate, endDate);
            ResponseHandler.sendSuccess(res, 'User growth analytics retrieved', result);
        } catch (error) {
            logger.error(`User growth analytics error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/admin/announcements
// @desc    Create platform announcement
// @access  Private/Admin
router.post(
    '/announcements',
    authenticate,
    authorize('admin'),
    validate(adminValidation.createAnnouncement),
    async (req, res) => {
        try {
            const result = await AdminController.createAnnouncement(req.body);
            ResponseHandler.sendSuccess(res, 'Announcement created', result);
        } catch (error) {
            logger.error(`Create announcement error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/announcements
// @desc    Get all announcements
// @access  Private/Admin
router.get(
    '/announcements',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getAnnouncements, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getAnnouncements(status, pagination);
            ResponseHandler.sendPaginated(res, 'Announcements retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get announcements error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/announcements/:id
// @desc    Update announcement
// @access  Private/Admin
router.put(
    '/announcements/:id',
    authenticate,
    authorize('admin'),
    validate(adminValidation.updateAnnouncement),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.updateAnnouncement(id, req.body);
            ResponseHandler.sendSuccess(res, 'Announcement updated', result);
        } catch (error) {
            logger.error(`Update announcement error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   DELETE /api/admin/announcements/:id
// @desc    Delete announcement
// @access  Private/Admin
router.delete(
    '/announcements/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AdminController.deleteAnnouncement(id);
            ResponseHandler.sendSuccess(res, 'Announcement deleted', result);
        } catch (error) {
            logger.error(`Delete announcement error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/settings
// @desc    Get platform settings
// @access  Private/Admin
router.get(
    '/settings',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await AdminController.getPlatformSettings();
            ResponseHandler.sendSuccess(res, 'Platform settings retrieved', result);
        } catch (error) {
            logger.error(`Get settings error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/admin/settings
// @desc    Update platform settings
// @access  Private/Admin
router.put(
    '/settings',
    authenticate,
    authorize('admin'),
    validate(adminValidation.updateSettings),
    async (req, res) => {
        try {
            const result = await AdminController.updatePlatformSettings(req.body);
            ResponseHandler.sendSuccess(res, 'Platform settings updated', result);
        } catch (error) {
            logger.error(`Update settings error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/logs
// @desc    Get system logs
// @access  Private/Admin
router.get(
    '/logs',
    authenticate,
    authorize('admin'),
    validate(adminValidation.getLogs, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, type, startDate, endDate } = req.query;
            const filters = { type, startDate, endDate };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AdminController.getSystemLogs(filters, pagination);
            ResponseHandler.sendPaginated(res, 'System logs retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get logs error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/admin/backup
// @desc    Trigger database backup
// @access  Private/Admin
router.post(
    '/backup',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await AdminController.triggerBackup();
            ResponseHandler.sendSuccess(res, 'Backup triggered successfully', result);
        } catch (error) {
            logger.error(`Backup error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/backups
// @desc    Get backup history
// @access  Private/Admin
router.get(
    '/backups',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await AdminController.getBackupHistory();
            ResponseHandler.sendSuccess(res, 'Backup history retrieved', result);
        } catch (error) {
            logger.error(`Get backups error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/admin/bulk-actions/users
// @desc    Perform bulk actions on users
// @access  Private/Admin
router.post(
    '/bulk-actions/users',
    authenticate,
    authorize('admin'),
    validate(adminValidation.bulkUserActions),
    async (req, res) => {
        try {
            const { action, userIds, data } = req.body;
            const result = await AdminController.bulkUserActions(action, userIds, data);
            ResponseHandler.sendSuccess(res, 'Bulk action completed', result);
        } catch (error) {
            logger.error(`Bulk user action error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/admin/dashboard-widgets
// @desc    Get dashboard widgets data
// @access  Private/Admin
router.get(
    '/dashboard-widgets',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await AdminController.getDashboardWidgets();
            ResponseHandler.sendSuccess(res, 'Dashboard widgets retrieved', result);
        } catch (error) {
            logger.error(`Dashboard widgets error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;