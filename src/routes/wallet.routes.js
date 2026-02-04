const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/wallet.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const walletValidation = require('../validations/wallet.validation');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   GET /api/wallet/balance
// @desc    Get wallet balance
// @access  Private
router.get(
    '/balance',
    authenticate,
    async (req, res) => {
        try {
            const result = await WalletController.getWalletBalance(req.user._id);
            ResponseHandler.sendSuccess(res, 'Wallet balance retrieved', result);
        } catch (error) {
            logger.error(`Get balance error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/transactions
// @desc    Get wallet transactions
// @access  Private
router.get(
    '/transactions',
    authenticate,
    validate(walletValidation.getTransactions, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, type, startDate, endDate } = req.query;
            const filters = { type, startDate, endDate };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WalletController.getTransactions(req.user._id, filters, pagination);
            ResponseHandler.sendPaginated(res, 'Transactions retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get transactions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/transactions/:id
// @desc    Get transaction details
// @access  Private
router.get(
    '/transactions/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WalletController.getTransactionDetails(id, req.user._id);
            ResponseHandler.sendSuccess(res, 'Transaction details retrieved', result);
        } catch (error) {
            logger.error(`Get transaction error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/add-funds
// @desc    Add funds to wallet
// @access  Private
router.post(
    '/add-funds',
    authenticate,
    validate(walletValidation.addFunds),
    async (req, res) => {
        try {
            const { amount, paymentMethod } = req.body;
            const result = await WalletController.addFunds(req.user._id, amount, paymentMethod);
            ResponseHandler.sendSuccess(res, 'Funds added successfully', result);
        } catch (error) {
            logger.error(`Add funds error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/transfer
// @desc    Transfer funds to another user
// @access  Private
router.post(
    '/transfer',
    authenticate,
    validate(walletValidation.transferFunds),
    async (req, res) => {
        try {
            const { toUserId, amount, description } = req.body;
            const result = await WalletController.transferFunds(
                req.user._id,
                toUserId,
                amount,
                description
            );
            ResponseHandler.sendSuccess(res, 'Funds transferred successfully', result);
        } catch (error) {
            logger.error(`Transfer funds error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/pay-course
// @desc    Pay for course using wallet
// @access  Private
router.post(
    '/pay-course',
    authenticate,
    validate(walletValidation.payCourse),
    async (req, res) => {
        try {
            const { courseId } = req.body;
            const result = await WalletController.payForCourse(req.user._id, courseId);
            ResponseHandler.sendSuccess(res, 'Course payment successful', result);
        } catch (error) {
            logger.error(`Pay course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/statement
// @desc    Get wallet statement
// @access  Private
router.get(
    '/statement',
    authenticate,
    validate(walletValidation.getStatement, ['query']),
    async (req, res) => {
        try {
            const { month, year, format = 'pdf' } = req.query;
            const result = await WalletController.generateStatement(
                req.user._id,
                month,
                year,
                format
            );
            ResponseHandler.sendSuccess(res, 'Statement generated', result);
        } catch (error) {
            logger.error(`Get statement error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/summary
// @desc    Get wallet summary
// @access  Private
router.get(
    '/summary',
    authenticate,
    validate(walletValidation.getSummary, ['query']),
    async (req, res) => {
        try {
            const { period = 'monthly' } = req.query;
            const result = await WalletController.getWalletSummary(req.user._id, period);
            ResponseHandler.sendSuccess(res, 'Wallet summary retrieved', result);
        } catch (error) {
            logger.error(`Get summary error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/withdraw-request
// @desc    Request withdrawal from wallet
// @access  Private
router.post(
    '/withdraw-request',
    authenticate,
    validate(walletValidation.requestWithdrawal),
    async (req, res) => {
        try {
            const { amount, method, accountDetails } = req.body;
            const result = await WalletController.requestWithdrawal(
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

// @route   GET /api/wallet/withdrawal-history
// @desc    Get withdrawal history
// @access  Private
router.get(
    '/withdrawal-history',
    authenticate,
    validate(walletValidation.getWithdrawalHistory, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const filters = { status };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WalletController.getWithdrawalHistory(
                req.user._id,
                filters,
                pagination
            );
            ResponseHandler.sendPaginated(res, 'Withdrawal history retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get withdrawal history error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/recent-activity
// @desc    Get recent wallet activity
// @access  Private
router.get(
    '/recent-activity',
    authenticate,
    async (req, res) => {
        try {
            const result = await WalletController.getRecentActivity(req.user._id);
            ResponseHandler.sendSuccess(res, 'Recent activity retrieved', result);
        } catch (error) {
            logger.error(`Get recent activity error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/cancel-withdrawal/:id
// @desc    Cancel withdrawal request
// @access  Private
router.post(
    '/cancel-withdrawal/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await WalletController.cancelWithdrawal(id, req.user._id);
            ResponseHandler.sendSuccess(res, 'Withdrawal cancelled', result);
        } catch (error) {
            logger.error(`Cancel withdrawal error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/verify-payment/:orderId
// @desc    Verify wallet payment
// @access  Private
router.get(
    '/verify-payment/:orderId',
    authenticate,
    async (req, res) => {
        try {
            const { orderId } = req.params;
            const result = await WalletController.verifyPayment(orderId, req.user._id);
            ResponseHandler.sendSuccess(res, 'Payment verified', result);
        } catch (error) {
            logger.error(`Verify payment error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/admin/transactions
// @desc    Get all wallet transactions (Admin only)
// @access  Private/Admin
router.get(
    '/admin/transactions',
    authenticate,
    authorize('admin'),
    validate(walletValidation.getAllTransactions, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, userId, type, startDate, endDate } = req.query;
            const filters = { userId, type, startDate, endDate };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WalletController.getAllTransactions(filters, pagination);
            ResponseHandler.sendPaginated(res, 'All transactions retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get all transactions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/admin/summary
// @desc    Get admin wallet summary (Admin only)
// @access  Private/Admin
router.get(
    '/admin/summary',
    authenticate,
    authorize('admin'),
    validate(walletValidation.getAdminSummary, ['query']),
    async (req, res) => {
        try {
            const { period = 'daily' } = req.query;
            const result = await WalletController.getAdminWalletSummary(period);
            ResponseHandler.sendSuccess(res, 'Admin wallet summary retrieved', result);
        } catch (error) {
            logger.error(`Admin summary error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/admin/manual-adjustment
// @desc    Manual wallet adjustment (Admin only)
// @access  Private/Admin
router.post(
    '/admin/manual-adjustment',
    authenticate,
    authorize('admin'),
    validate(walletValidation.manualAdjustment),
    async (req, res) => {
        try {
            const { userId, amount, type, reason } = req.body;
            const result = await WalletController.manualAdjustment(userId, amount, type, reason);
            ResponseHandler.sendSuccess(res, 'Manual adjustment completed', result);
        } catch (error) {
            logger.error(`Manual adjustment error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/admin/user-balances
// @desc    Get all user balances (Admin only)
// @access  Private/Admin
router.get(
    '/admin/user-balances',
    authenticate,
    authorize('admin'),
    validate(walletValidation.getUserBalances, ['query']),
    async (req, res) => {
        try {
            const { page = 1, limit = 50, minBalance, maxBalance } = req.query;
            const filters = { minBalance, maxBalance };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await WalletController.getAllUserBalances(filters, pagination);
            ResponseHandler.sendPaginated(res, 'User balances retrieved', result.data, result.pagination);
        } catch (error) {
            logger.error(`Get user balances error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/wallet/admin/transaction-report
// @desc    Generate transaction report (Admin only)
// @access  Private/Admin
router.get(
    '/admin/transaction-report',
    authenticate,
    authorize('admin'),
    validate(walletValidation.generateTransactionReport, ['query']),
    async (req, res) => {
        try {
            const { startDate, endDate, format = 'excel' } = req.query;
            const result = await WalletController.generateTransactionReport(startDate, endDate, format);
            ResponseHandler.sendSuccess(res, 'Transaction report generated', result);
        } catch (error) {
            logger.error(`Transaction report error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/admin/freeze-wallet/:userId
// @desc    Freeze user wallet (Admin only)
// @access  Private/Admin
router.post(
    '/admin/freeze-wallet/:userId',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await WalletController.freezeWallet(userId, req.body);
            ResponseHandler.sendSuccess(res, 'Wallet frozen', result);
        } catch (error) {
            logger.error(`Freeze wallet error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/wallet/admin/unfreeze-wallet/:userId
// @desc    Unfreeze user wallet (Admin only)
// @access  Private/Admin
router.post(
    '/admin/unfreeze-wallet/:userId',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await WalletController.unfreezeWallet(userId);
            ResponseHandler.sendSuccess(res, 'Wallet unfrozen', result);
        } catch (error) {
            logger.error(`Unfreeze wallet error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;