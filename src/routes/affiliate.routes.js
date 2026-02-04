const express = require('express');
const router = express.Router();
const AffiliateController = require('../controllers/affiliate.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const affiliateValidation = require('../validations/affiliate.validation');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   GET /api/affiliate/dashboard
// @desc    Get affiliate dashboard stats
// @access  Private/Affiliate
router.get(
    '/dashboard',
    authenticate,
    authorize(['affiliate', 'admin']),
    async (req, res) => {
        try {
            const result = await AffiliateController.getDashboard(req.user._id);
            ResponseHandler.sendSuccess(res, 'Dashboard data retrieved', result);
        } catch (error) {
            logger.error(`Dashboard error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/stats
// @desc    Get affiliate detailed statistics
// @access  Private/Affiliate
router.get(
    '/stats',
    authenticate,
    authorize(['affiliate', 'admin']),
    async (req, res) => {
        try {
            const { period = 'monthly' } = req.query;
            const result = await AffiliateController.getStats(req.user._id, period);
            ResponseHandler.sendSuccess(res, 'Statistics retrieved', result);
        } catch (error) {
            logger.error(`Stats error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/referral-link
// @desc    Get affiliate referral link
// @access  Private/Affiliate
router.get(
    '/referral-link',
    authenticate,
    authorize(['affiliate', 'admin']),
    async (req, res) => {
        try {
            const result = await AffiliateController.getReferralLink(req.user);
            ResponseHandler.sendSuccess(res, 'Referral link generated', result);
        } catch (error) {
            logger.error(`Referral link error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/commissions
// @desc    Get affiliate commission history
// @access  Private/Affiliate
router.get(
    '/commissions',
    authenticate,
    authorize(['affiliate', 'admin']),
    validate(affiliateValidation.getCommissions, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AffiliateController.getCommissions(
                req.user._id, 
                status, 
                pagination
            );
            ResponseHandler.sendPaginated(res, 'Commissions retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Commissions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/referred-users
// @desc    Get list of referred users
// @access  Private/Affiliate
router.get(
    '/referred-users',
    authenticate,
    authorize(['affiliate', 'admin']),
    validate(affiliateValidation.getReferredUsers, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AffiliateController.getReferredUsers(req.user._id, pagination);
            ResponseHandler.sendPaginated(res, 'Referred users retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Referred users error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/earning-summary
// @desc    Get affiliate earning summary
// @access  Private/Affiliate
router.get(
    '/earning-summary',
    authenticate,
    authorize(['affiliate', 'admin']),
    async (req, res) => {
        try {
            const result = await AffiliateController.getEarningSummary(req.user._id);
            ResponseHandler.sendSuccess(res, 'Earning summary retrieved', result);
        } catch (error) {
            logger.error(`Earning summary error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/affiliate/withdraw
// @desc    Request withdrawal of affiliate earnings
// @access  Private/Affiliate
router.post(
    '/withdraw',
    authenticate,
    authorize(['affiliate', 'admin']),
    validate(affiliateValidation.requestWithdrawal),
    async (req, res) => {
        try {
            const { amount, method, accountDetails } = req.body;
            const result = await AffiliateController.requestWithdrawal(
                req.user._id,
                amount,
                method,
                accountDetails
            );
            ResponseHandler.sendSuccess(res, 'Withdrawal request submitted', result);
        } catch (error) {
            logger.error(`Withdrawal request error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/withdrawal-history
// @desc    Get withdrawal request history
// @access  Private/Affiliate
router.get(
    '/withdrawal-history',
    authenticate,
    authorize(['affiliate', 'admin']),
    validate(affiliateValidation.getWithdrawalHistory, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AffiliateController.getWithdrawalHistory(
                req.user._id,
                status,
                pagination
            );
            ResponseHandler.sendPaginated(res, 'Withdrawal history retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Withdrawal history error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/affiliate/generate-promo
// @desc    Generate promotional material
// @access  Private/Affiliate
router.post(
    '/generate-promo',
    authenticate,
    authorize(['affiliate', 'admin']),
    validate(affiliateValidation.generatePromo),
    async (req, res) => {
        try {
            const { type, courseId, customText } = req.body;
            const result = await AffiliateController.generatePromotionalMaterial(
                req.user._id,
                type,
                courseId,
                customText
            );
            ResponseHandler.sendSuccess(res, 'Promotional material generated', result);
        } catch (error) {
            logger.error(`Generate promo error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/top-performers
// @desc    Get top performing affiliates (Admin only)
// @access  Private/Admin
router.get(
    '/top-performers',
    authenticate,
    authorize('admin'),
    validate(affiliateValidation.getTopPerformers, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly', limit = 10 } = req.query;
            const result = await AffiliateController.getTopPerformers(period, parseInt(limit));
            ResponseHandler.sendSuccess(res, 'Top performers retrieved', result);
        } catch (error) {
            logger.error(`Top performers error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/all-commissions
// @desc    Get all affiliate commissions (Admin only)
// @access  Private/Admin
router.get(
    '/all-commissions',
    authenticate,
    authorize('admin'),
    validate(affiliateValidation.getAllCommissions, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, affiliateId, status, startDate, endDate } = req.query;
            const filters = { affiliateId, status, startDate, endDate };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AffiliateController.getAllCommissions(filters, pagination);
            ResponseHandler.sendPaginated(res, 'All commissions retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`All commissions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/affiliate/commissions/:id/status
// @desc    Update commission status (Admin only)
// @access  Private/Admin
router.put(
    '/commissions/:id/status',
    authenticate,
    authorize('admin'),
    validate(affiliateValidation.updateCommissionStatus),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AffiliateController.updateCommissionStatus(id, req.body);
            ResponseHandler.sendSuccess(res, 'Commission status updated', result);
        } catch (error) {
            logger.error(`Update commission status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/affiliates
// @desc    Get all affiliates list (Admin only)
// @access  Private/Admin
router.get(
    '/affiliates',
    authenticate,
    authorize('admin'),
    validate(affiliateValidation.getAffiliates, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, status } = req.query;
            const filters = { search, status };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AffiliateController.getAllAffiliates(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Affiliates retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get affiliates error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/performance-report
// @desc    Get affiliate performance report (Admin only)
// @access  Private/Admin
router.get(
    '/performance-report',
    authenticate,
    authorize('admin'),
    validate(affiliateValidation.getPerformanceReport, ['query']),
    async (req, res) => {
        try {
            const { startDate, endDate, affiliateId } = req.query;
            const result = await AffiliateController.generatePerformanceReport(startDate, endDate, affiliateId);
            ResponseHandler.sendSuccess(res, 'Performance report generated', result);
        } catch (error) {
            logger.error(`Performance report error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/affiliate/settings
// @desc    Update affiliate settings (Admin only)
// @access  Private/Admin
router.post(
    '/settings',
    authenticate,
    authorize('admin'),
    validate(affiliateValidation.updateAffiliateSettings),
    async (req, res) => {
        try {
            const result = await AffiliateController.updateAffiliateSettings(req.body);
            ResponseHandler.sendSuccess(res, 'Affiliate settings updated', result);
        } catch (error) {
            logger.error(`Update settings error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/affiliate/leaderboard
// @desc    Get affiliate leaderboard
// @access  Private/Affiliate
router.get(
    '/leaderboard',
    authenticate,
    authorize(['affiliate', 'admin']),
    validate(affiliateValidation.getLeaderboard, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly' } = req.query;
            const result = await AffiliateController.getLeaderboard(period);
            ResponseHandler.sendSuccess(res, 'Leaderboard retrieved', result);
        } catch (error) {
            logger.error(`Leaderboard error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/affiliate/track-click
// @desc    Track affiliate link click
// @access  Public
router.post(
    '/track-click',
    validate(affiliateValidation.trackClick),
    async (req, res) => {
        try {
            const { affiliateCode, courseId, source } = req.body;
            const result = await AffiliateController.trackClick(affiliateCode, courseId, source);
            ResponseHandler.sendSuccess(res, 'Click tracked', result);
        } catch (error) {
            logger.error(`Track click error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/affiliate/track-conversion
// @desc    Track affiliate conversion
// @access  Private
router.post(
    '/track-conversion',
    authenticate,
    validate(affiliateValidation.trackConversion),
    async (req, res) => {
        try {
            const { orderId, affiliateCode } = req.body;
            const result = await AffiliateController.trackConversion(orderId, affiliateCode);
            ResponseHandler.sendSuccess(res, 'Conversion tracked', result);
        } catch (error) {
            logger.error(`Track conversion error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;