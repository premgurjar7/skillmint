const AffiliateService = require('../services/affiliate.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Get affiliate dashboard stats
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;
        const dashboardStats = await AffiliateService.getDashboardStats(userId);
        
        ResponseHandler.sendSuccess(res, 'Dashboard stats retrieved', dashboardStats);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get affiliate detailed statistics
exports.getStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'monthly' } = req.query;
        
        const stats = await AffiliateService.getStats(userId, period);
        ResponseHandler.sendSuccess(res, 'Statistics retrieved', stats);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get affiliate referral link
exports.getReferralLink = async (req, res) => {
    try {
        const user = req.user;
        const referralLink = await AffiliateService.generateReferralLink(user);
        
        ResponseHandler.sendSuccess(res, 'Referral link generated', referralLink);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get affiliate commission history
exports.getCommissions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;
        const { page, limit } = req.query;
        
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        const result = await AffiliateService.getCommissions(userId, status, pagination);
        
        ResponseHandler.sendPaginated(res, 'Commissions retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get list of referred users
exports.getReferredUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page, limit } = req.query;
        
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        const result = await AffiliateService.getReferredUsers(userId, pagination);
        
        ResponseHandler.sendPaginated(res, 'Referred users retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get affiliate earning summary
exports.getEarningSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const summary = await AffiliateService.getEarningSummary(userId);
        
        ResponseHandler.sendSuccess(res, 'Earning summary retrieved', summary);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Request withdrawal of affiliate earnings
exports.requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, method, accountDetails } = req.body;
        
        const withdrawalRequest = await AffiliateService.requestWithdrawal(
            userId,
            amount,
            method,
            accountDetails
        );
        
        ResponseHandler.sendSuccess(res, 'Withdrawal request submitted', withdrawalRequest);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal request history
exports.getWithdrawalHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;
        const { page, limit } = req.query;
        
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        const result = await AffiliateService.getWithdrawalHistory(userId, status, pagination);
        
        ResponseHandler.sendPaginated(res, 'Withdrawal history retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Generate promotional material
exports.generatePromotionalMaterial = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, courseId, customText } = req.body;
        
        const promoMaterial = await AffiliateService.generatePromotionalMaterial(
            userId,
            type,
            courseId,
            customText
        );
        
        ResponseHandler.sendSuccess(res, 'Promotional material generated', promoMaterial);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get top performing affiliates (Admin only)
exports.getTopPerformers = async (req, res) => {
    try {
        const { period = 'monthly', limit = 10 } = req.query;
        
        const topPerformers = await AffiliateService.getTopPerformers(period, parseInt(limit));
        ResponseHandler.sendSuccess(res, 'Top performers retrieved', topPerformers);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all affiliate commissions (Admin only)
exports.getAllCommissions = async (req, res) => {
    try {
        const { affiliateId, status, startDate, endDate } = req.query;
        const { page, limit } = req.query;
        
        const filters = { affiliateId, status, startDate, endDate };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };
        
        const result = await AffiliateService.getAllCommissions(filters, pagination);
        ResponseHandler.sendPaginated(res, 'All commissions retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update commission status (Admin only)
exports.updateCommissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        
        const updatedCommission = await AffiliateService.updateCommissionStatus(id, { status, remarks });
        ResponseHandler.sendSuccess(res, 'Commission status updated', updatedCommission);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all affiliates list (Admin only)
exports.getAllAffiliates = async (req, res) => {
    try {
        const { search, status } = req.query;
        const { page, limit } = req.query;
        
        const filters = { search, status };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        
        const result = await AffiliateService.getAllAffiliates(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Affiliates retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Generate performance report (Admin only)
exports.generatePerformanceReport = async (req, res) => {
    try {
        const { startDate, endDate, affiliateId } = req.query;
        
        const report = await AffiliateService.generatePerformanceReport(startDate, endDate, affiliateId);
        ResponseHandler.sendSuccess(res, 'Performance report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update affiliate settings (Admin only)
exports.updateAffiliateSettings = async (req, res) => {
    try {
        const settings = req.body;
        
        const updatedSettings = await AffiliateService.updateAffiliateSettings(settings);
        ResponseHandler.sendSuccess(res, 'Affiliate settings updated', updatedSettings);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get affiliate leaderboard
exports.getLeaderboard = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        
        const leaderboard = await AffiliateService.getLeaderboard(period);
        ResponseHandler.sendSuccess(res, 'Leaderboard retrieved', leaderboard);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Track affiliate link click
exports.trackClick = async (req, res) => {
    try {
        const { affiliateCode, courseId, source } = req.body;
        
        const clickData = await AffiliateService.trackClick(affiliateCode, courseId, source);
        ResponseHandler.sendSuccess(res, 'Click tracked', clickData);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Track affiliate conversion
exports.trackConversion = async (req, res) => {
    try {
        const { orderId, affiliateCode } = req.body;
        
        const conversionData = await AffiliateService.trackConversion(orderId, affiliateCode);
        ResponseHandler.sendSuccess(res, 'Conversion tracked', conversionData);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};