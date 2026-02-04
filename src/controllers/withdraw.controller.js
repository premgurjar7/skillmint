const WithdrawService = require('../services/withdraw.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, method, accountDetails, notes } = req.body;
        
        const result = await WithdrawService.requestWithdrawal(
            userId,
            amount,
            method,
            accountDetails,
            notes
        );
        ResponseHandler.sendSuccess(res, 'Withdrawal request submitted', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get user withdrawal requests
exports.getUserRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;
        const { page, limit } = req.query;
        
        const filters = { status };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        
        const result = await WithdrawService.getUserRequests(userId, filters, pagination);
        ResponseHandler.sendPaginated(res, 'Withdrawal requests retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal request details
exports.getRequestDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const request = await WithdrawService.getRequestDetails(id, userId);
        ResponseHandler.sendSuccess(res, 'Request details retrieved', request);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Cancel withdrawal request
exports.cancelRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const result = await WithdrawService.cancelRequest(id, userId);
        ResponseHandler.sendSuccess(res, 'Withdrawal request cancelled', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get available withdrawal methods
exports.getWithdrawalMethods = async (req, res) => {
    try {
        const methods = await WithdrawService.getWithdrawalMethods();
        ResponseHandler.sendSuccess(res, 'Withdrawal methods retrieved', methods);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal limits
exports.getWithdrawalLimits = async (req, res) => {
    try {
        const userId = req.user._id;
        const limits = await WithdrawService.getWithdrawalLimits(userId);
        
        ResponseHandler.sendSuccess(res, 'Withdrawal limits retrieved', limits);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal summary
exports.getUserWithdrawalSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'monthly' } = req.query;
        
        const summary = await WithdrawService.getUserWithdrawalSummary(userId, period);
        ResponseHandler.sendSuccess(res, 'Withdrawal summary retrieved', summary);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// ADMIN FUNCTIONS

// Get all withdrawal requests (Admin)
exports.getAllRequests = async (req, res) => {
    try {
        const { status, userId, method, startDate, endDate } = req.query;
        const { page, limit } = req.query;
        
        const filters = { status, userId, method, startDate, endDate };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };
        
        const result = await WithdrawService.getAllRequests(filters, pagination);
        ResponseHandler.sendPaginated(res, 'All withdrawal requests retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal request details (Admin)
exports.getAdminRequestDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await WithdrawService.getAdminRequestDetails(id);
        
        ResponseHandler.sendSuccess(res, 'Request details retrieved', request);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update withdrawal request status (Admin)
exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        
        const result = await WithdrawService.updateRequestStatus(id, { status, remarks });
        ResponseHandler.sendSuccess(res, 'Request status updated', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Process withdrawal request (Admin)
exports.processWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionId, processedBy } = req.body;
        
        const result = await WithdrawService.processWithdrawal(id, { transactionId, processedBy });
        ResponseHandler.sendSuccess(res, 'Withdrawal processed', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Reject withdrawal request (Admin)
exports.rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const result = await WithdrawService.rejectWithdrawal(id, reason);
        ResponseHandler.sendSuccess(res, 'Withdrawal rejected', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Bulk process withdrawal requests (Admin)
exports.bulkProcessRequests = async (req, res) => {
    try {
        const { requestIds, action } = req.body;
        
        const result = await WithdrawService.bulkProcessRequests(requestIds, action);
        ResponseHandler.sendSuccess(res, 'Bulk processing completed', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal statistics (Admin)
exports.getWithdrawalStats = async (req, res) => {
    try {
        const { period = 'monthly', startDate, endDate } = req.query;
        
        const stats = await WithdrawService.getWithdrawalStats(period, startDate, endDate);
        ResponseHandler.sendSuccess(res, 'Withdrawal stats retrieved', stats);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Generate withdrawal report (Admin)
exports.generateWithdrawalReport = async (req, res) => {
    try {
        const { startDate, endDate, format = 'excel' } = req.query;
        
        const report = await WithdrawService.generateWithdrawalReport(startDate, endDate, format);
        ResponseHandler.sendSuccess(res, 'Withdrawal report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update withdrawal methods (Admin)
exports.updateWithdrawalMethods = async (req, res) => {
    try {
        const methods = req.body;
        const result = await WithdrawService.updateWithdrawalMethods(methods);
        
        ResponseHandler.sendSuccess(res, 'Withdrawal methods updated', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update withdrawal limits (Admin)
exports.updateWithdrawalLimits = async (req, res) => {
    try {
        const limits = req.body;
        const result = await WithdrawService.updateWithdrawalLimits(limits);
        
        ResponseHandler.sendSuccess(res, 'Withdrawal limits updated', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get pending requests count (Admin)
exports.getPendingRequestsCount = async (req, res) => {
    try {
        const count = await WithdrawService.getPendingRequestsCount();
        ResponseHandler.sendSuccess(res, 'Pending requests count retrieved', { count });
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get approval queue (Admin)
exports.getApprovalQueue = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        
        const result = await WithdrawService.getApprovalQueue(pagination);
        ResponseHandler.sendPaginated(res, 'Approval queue retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Add admin notes to withdrawal request (Admin)
exports.addAdminNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        const result = await WithdrawService.addAdminNotes(id, notes);
        ResponseHandler.sendSuccess(res, 'Admin notes added', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get fraud detection alerts (Admin)
exports.getFraudDetectionAlerts = async (req, res) => {
    try {
        const alerts = await WithdrawService.getFraudDetectionAlerts();
        ResponseHandler.sendSuccess(res, 'Fraud detection alerts retrieved', alerts);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Flag withdrawal request for review (Admin)
exports.flagRequestForReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const result = await WithdrawService.flagRequestForReview(id, reason);
        ResponseHandler.sendSuccess(res, 'Request flagged for review', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get flagged withdrawal requests (Admin)
exports.getFlaggedRequests = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        
        const result = await WithdrawService.getFlaggedRequests(pagination);
        ResponseHandler.sendPaginated(res, 'Flagged requests retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};