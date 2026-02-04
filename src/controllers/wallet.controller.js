const WalletService = require('../services/wallet.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Get wallet balance
exports.getWalletBalance = async (req, res) => {
    try {
        const userId = req.user._id;
        const balance = await WalletService.getWalletBalance(userId);
        
        ResponseHandler.sendSuccess(res, 'Wallet balance retrieved', balance);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get wallet transactions
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, startDate, endDate } = req.query;
        const { page, limit } = req.query;
        
        const filters = { type, startDate, endDate };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        
        const result = await WalletService.getTransactions(userId, filters, pagination);
        ResponseHandler.sendPaginated(res, 'Transactions retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get transaction details
exports.getTransactionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const transaction = await WalletService.getTransactionDetails(id, userId);
        ResponseHandler.sendSuccess(res, 'Transaction details retrieved', transaction);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Add funds to wallet
exports.addFunds = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, paymentMethod } = req.body;
        
        const result = await WalletService.addFunds(userId, amount, paymentMethod);
        ResponseHandler.sendSuccess(res, 'Funds added successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Transfer funds to another user
exports.transferFunds = async (req, res) => {
    try {
        const userId = req.user._id;
        const { toUserId, amount, description } = req.body;
        
        const result = await WalletService.transferFunds(userId, toUserId, amount, description);
        ResponseHandler.sendSuccess(res, 'Funds transferred successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Pay for course using wallet
exports.payForCourse = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.body;
        
        const result = await WalletService.payForCourse(userId, courseId);
        ResponseHandler.sendSuccess(res, 'Course payment successful', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Generate wallet statement
exports.generateStatement = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month, year, format = 'pdf' } = req.query;
        
        const statement = await WalletService.generateStatement(userId, month, year, format);
        ResponseHandler.sendSuccess(res, 'Statement generated', statement);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get wallet summary
exports.getWalletSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'monthly' } = req.query;
        
        const summary = await WalletService.getWalletSummary(userId, period);
        ResponseHandler.sendSuccess(res, 'Wallet summary retrieved', summary);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Request withdrawal from wallet
exports.requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, method, accountDetails } = req.body;
        
        const result = await WalletService.requestWithdrawal(userId, amount, method, accountDetails);
        ResponseHandler.sendSuccess(res, 'Withdrawal request submitted', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;
        const { page, limit } = req.query;
        
        const filters = { status };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
        
        const result = await WalletService.getWithdrawalHistory(userId, filters, pagination);
        ResponseHandler.sendPaginated(res, 'Withdrawal history retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get recent wallet activity
exports.getRecentActivity = async (req, res) => {
    try {
        const userId = req.user._id;
        const activity = await WalletService.getRecentActivity(userId);
        
        ResponseHandler.sendSuccess(res, 'Recent activity retrieved', activity);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Cancel withdrawal request
exports.cancelWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const result = await WalletService.cancelWithdrawal(id, userId);
        ResponseHandler.sendSuccess(res, 'Withdrawal cancelled', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Verify wallet payment
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;
        
        const result = await WalletService.verifyPayment(orderId, userId);
        ResponseHandler.sendSuccess(res, 'Payment verified', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// ADMIN FUNCTIONS

// Get all wallet transactions (Admin)
exports.getAllTransactions = async (req, res) => {
    try {
        const { userId, type, startDate, endDate } = req.query;
        const { page, limit } = req.query;
        
        const filters = { userId, type, startDate, endDate };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };
        
        const result = await WalletService.getAllTransactions(filters, pagination);
        ResponseHandler.sendPaginated(res, 'All transactions retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get admin wallet summary (Admin)
exports.getAdminWalletSummary = async (req, res) => {
    try {
        const { period = 'daily' } = req.query;
        const summary = await WalletService.getAdminWalletSummary(period);
        
        ResponseHandler.sendSuccess(res, 'Admin wallet summary retrieved', summary);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Manual wallet adjustment (Admin)
exports.manualAdjustment = async (req, res) => {
    try {
        const { userId, amount, type, reason } = req.body;
        
        const result = await WalletService.manualAdjustment(userId, amount, type, reason);
        ResponseHandler.sendSuccess(res, 'Manual adjustment completed', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get all user balances (Admin)
exports.getAllUserBalances = async (req, res) => {
    try {
        const { minBalance, maxBalance } = req.query;
        const { page, limit } = req.query;
        
        const filters = { minBalance, maxBalance };
        const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 50 };
        
        const result = await WalletService.getAllUserBalances(filters, pagination);
        ResponseHandler.sendPaginated(res, 'User balances retrieved', result.data, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Generate transaction report (Admin)
exports.generateTransactionReport = async (req, res) => {
    try {
        const { startDate, endDate, format = 'excel' } = req.query;
        
        const report = await WalletService.generateTransactionReport(startDate, endDate, format);
        ResponseHandler.sendSuccess(res, 'Transaction report generated', report);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Freeze user wallet (Admin)
exports.freezeWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        
        const result = await WalletService.freezeWallet(userId, reason);
        ResponseHandler.sendSuccess(res, 'Wallet frozen', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Unfreeze user wallet (Admin)
exports.unfreezeWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await WalletService.unfreezeWallet(userId);
        
        ResponseHandler.sendSuccess(res, 'Wallet unfrozen', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};