const express = require('express');
const router = express.Router();
const WithdrawController = require('../controllers/withdraw.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const withdrawValidation = require('../validations/withdraw.validation');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   POST /api/withdraw/request
// @desc    Request withdrawal
// @access  Private
router.post(
    '/request',
    authenticate,
    validate(withdrawValidation.requestWithdrawal),
    async (req, res) => {
        try {
            const { amount, method, accountDetails, notes } = req.body;
            const result = await WithdrawController.requestWithdrawal(
                req.user._id,
                amount,
                method,
                accountDetails,
                notes
            );
            ResponseHandler.sendSuccess(res, 'Withdrawal request submitted', result);
        } catch (error) {
            logger.error(`Withdrawal request error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/requests
// @desc    Get user withdrawal requests
// @access  Private
router.get(
    '/requests',
    authenticate,
    validate(withdrawValidation.getUserRequests, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const filters = { status };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WithdrawController.getUserRequests(
                req.user._id,
                filters,
                pagination
            );
            ResponseHandler.sendPaginated(res, 'Withdrawal requests retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get user requests error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/requests/:id
// @desc    Get withdrawal request details
// @access  Private
router.get(
    '/requests/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.getRequestDetails(id, req.user._id);
            ResponseHandler.sendSuccess(res, 'Request details retrieved', result);
        } catch (error) {
            logger.error(`Get request details error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/withdraw/cancel/:id
// @desc    Cancel withdrawal request
// @access  Private
router.post(
    '/cancel/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.cancelRequest(id, req.user._id);
            ResponseHandler.sendSuccess(res, 'Withdrawal request cancelled', result);
        } catch (error) {
            logger.error(`Cancel request error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/methods
// @desc    Get available withdrawal methods
// @access  Private
router.get(
    '/methods',
    authenticate,
    async (req, res) => {
        try {
            const result = await WithdrawController.getWithdrawalMethods();
            ResponseHandler.sendSuccess(res, 'Withdrawal methods retrieved', result);
        } catch (error) {
            logger.error(`Get methods error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/limits
// @desc    Get withdrawal limits
// @access  Private
router.get(
    '/limits',
    authenticate,
    async (req, res) => {
        try {
            const result = await WithdrawController.getWithdrawalLimits(req.user._id);
            ResponseHandler.sendSuccess(res, 'Withdrawal limits retrieved', result);
        } catch (error) {
            logger.error(`Get limits error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/summary
// @desc    Get withdrawal summary
// @access  Private
router.get(
    '/summary',
    authenticate,
    validate(withdrawValidation.getSummary, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly' } = req.query;
            const result = await WithdrawController.getUserWithdrawalSummary(req.user._id, period);
            ResponseHandler.sendSuccess(res, 'Withdrawal summary retrieved', result);
        } catch (error) {
            logger.error(`Get summary error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/requests
// @desc    Get all withdrawal requests (Admin only)
// @access  Private/Admin
router.get(
    '/admin/requests',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.getAllRequests, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, status, userId, method, startDate, endDate } = req.query;
            const filters = { status, userId, method, startDate, endDate };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WithdrawController.getAllRequests(filters, pagination);
            ResponseHandler.sendPaginated(res, 'All withdrawal requests retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get all requests error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/requests/:id
// @desc    Get withdrawal request details (Admin only)
// @access  Private/Admin
router.get(
    '/admin/requests/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.getAdminRequestDetails(id);
            ResponseHandler.sendSuccess(res, 'Request details retrieved', result);
        } catch (error) {
            logger.error(`Get admin request details error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/withdraw/admin/requests/:id/status
// @desc    Update withdrawal request status (Admin only)
// @access  Private/Admin
router.put(
    '/admin/requests/:id/status',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.updateRequestStatus),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.updateRequestStatus(id, req.body);
            ResponseHandler.sendSuccess(res, 'Request status updated', result);
        } catch (error) {
            logger.error(`Update request status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/withdraw/admin/requests/:id/process
// @desc    Process withdrawal request (Admin only)
// @access  Private/Admin
router.post(
    '/admin/requests/:id/process',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.processRequest),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.processWithdrawal(id, req.body);
            ResponseHandler.sendSuccess(res, 'Withdrawal processed', result);
        } catch (error) {
            logger.error(`Process withdrawal error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/withdraw/admin/requests/:id/reject
// @desc    Reject withdrawal request (Admin only)
// @access  Private/Admin
router.post(
    '/admin/requests/:id/reject',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.rejectRequest),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.rejectWithdrawal(id, req.body);
            ResponseHandler.sendSuccess(res, 'Withdrawal rejected', result);
        } catch (error) {
            logger.error(`Reject withdrawal error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/withdraw/admin/requests/bulk-process
// @desc    Bulk process withdrawal requests (Admin only)
// @access  Private/Admin
router.post(
    '/admin/requests/bulk-process',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.bulkProcessRequests),
    async (req, res) => {
        try {
            const { requestIds, action } = req.body;
            const result = await WithdrawController.bulkProcessRequests(requestIds, action);
            ResponseHandler.sendSuccess(res, 'Bulk processing completed', result);
        } catch (error) {
            logger.error(`Bulk process error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/stats
// @desc    Get withdrawal statistics (Admin only)
// @access  Private/Admin
router.get(
    '/admin/stats',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.getAdminStats, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly', startDate, endDate } = req.query;
            const result = await WithdrawController.getWithdrawalStats(period, startDate, endDate);
            ResponseHandler.sendSuccess(res, 'Withdrawal stats retrieved', result);
        } catch (error) {
            logger.error(`Get stats error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/report
// @desc    Generate withdrawal report (Admin only)
// @access  Private/Admin
router.get(
    '/admin/report',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.generateReport, ['query']),
    async (req, res) => {
        try {
            const { startDate, endDate, format = 'excel' } = req.query;
            const result = await WithdrawController.generateWithdrawalReport(startDate, endDate, format);
            ResponseHandler.sendSuccess(res, 'Withdrawal report generated', result);
        } catch (error) {
            logger.error(`Generate report error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/withdraw/admin/methods
// @desc    Update withdrawal methods (Admin only)
// @access  Private/Admin
router.put(
    '/admin/methods',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.updateMethods),
    async (req, res) => {
        try {
            const result = await WithdrawController.updateWithdrawalMethods(req.body);
            ResponseHandler.sendSuccess(res, 'Withdrawal methods updated', result);
        } catch (error) {
            logger.error(`Update methods error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/withdraw/admin/limits
// @desc    Update withdrawal limits (Admin only)
// @access  Private/Admin
router.put(
    '/admin/limits',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.updateLimits),
    async (req, res) => {
        try {
            const result = await WithdrawController.updateWithdrawalLimits(req.body);
            ResponseHandler.sendSuccess(res, 'Withdrawal limits updated', result);
        } catch (error) {
            logger.error(`Update limits error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/pending-requests
// @desc    Get pending withdrawal requests count (Admin only)
// @access  Private/Admin
router.get(
    '/admin/pending-requests',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const result = await WithdrawController.getPendingRequestsCount();
            ResponseHandler.sendSuccess(res, 'Pending requests count retrieved', result);
        } catch (error) {
            logger.error(`Get pending requests error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/approval-queue
// @desc    Get approval queue (Admin only)
// @access  Private/Admin
router.get(
    '/admin/approval-queue',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.getApprovalQueue, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WithdrawController.getApprovalQueue(pagination);
            ResponseHandler.sendPaginated(res, 'Approval queue retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get approval queue error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/withdraw/admin/requests/:id/notes
// @desc    Add admin notes to withdrawal request (Admin only)
// @access  Private/Admin
router.post(
    '/admin/requests/:id/notes',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.addAdminNotes),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.addAdminNotes(id, req.body);
            ResponseHandler.sendSuccess(res, 'Admin notes added', result);
        } catch (error) {
            logger.error(`Add admin notes error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/fraud-detection
// @desc    Get fraud detection alerts (Admin only)
// @access  Private/Admin
router.get(
    '/admin/fraud-detection',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.getFraudDetection, ['query']),
    async (req, res) => {
        try {
            const result = await WithdrawController.getFraudDetectionAlerts();
            ResponseHandler.sendSuccess(res, 'Fraud detection alerts retrieved', result);
        } catch (error) {
            logger.error(`Fraud detection error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/withdraw/admin/flag-request/:id
// @desc    Flag withdrawal request for review (Admin only)
// @access  Private/Admin
router.post(
    '/admin/flag-request/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WithdrawController.flagRequestForReview(id, req.body);
            ResponseHandler.sendSuccess(res, 'Request flagged for review', result);
        } catch (error) {
            logger.error(`Flag request error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/withdraw/admin/flagged-requests
// @desc    Get flagged withdrawal requests (Admin only)
// @access  Private/Admin
router.get(
    '/admin/flagged-requests',
    authenticate,
    authorize('admin'),
    validate(withdrawValidation.getFlaggedRequests, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WithdrawController.getFlaggedRequests(pagination);
            ResponseHandler.sendPaginated(res, 'Flagged requests retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get flagged requests error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;