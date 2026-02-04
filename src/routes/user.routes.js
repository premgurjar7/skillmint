const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const AuthService = require('../services/auth.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get(
    '/',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, role, isActive } = req.query;
            
            const filters = { search, role, isActive: isActive === 'true' };
            const pagination = { 
                page: parseInt(page), 
                limit: parseInt(limit),
                sortBy: '-createdAt'
            };
            
            const result = await AuthService.searchUsers(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Users retrieved successfully', result.users, result.pagination);
        } catch (error) {
            logger.error(`Get users error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get(
    '/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own profile, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const user = await AuthService.getUserById(id);
            ResponseHandler.sendSuccess(res, 'User retrieved successfully', user);
        } catch (error) {
            logger.error(`Get user by ID error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put(
    '/:id',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can update their own profile, admin can update any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const result = await AuthService.updateProfile(id, req.body);
            ResponseHandler.sendSuccess(res, 'User updated successfully', result);
        } catch (error) {
            logger.error(`Update user error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Prevent admin from deleting themselves
            if (req.user._id.toString() === id) {
                return ResponseHandler.sendBadRequest(res, 'Cannot delete your own account');
            }
            
            const user = await User.findById(id);
            if (!user) {
                return ResponseHandler.sendNotFound(res, 'User not found');
            }
            
            // Soft delete - mark as inactive
            user.isActive = false;
            user.deletedAt = new Date();
            await user.save({ validateBeforeSave: false });
            
            logger.info(`User deleted by admin: ${id}`);
            
            ResponseHandler.sendSuccess(res, 'User deleted successfully');
        } catch (error) {
            logger.error(`Delete user error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/courses
// @desc    Get user's enrolled courses
// @access  Private
router.get(
    '/:id/courses',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own courses, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const { Order, Course } = require('../config/db');
            
            const orders = await Order.find({
                user: id,
                paymentStatus: 'completed'
            }).populate('course', 'title thumbnail price category level');
            
            const enrolledCourses = orders.map(order => ({
                course: order.course,
                enrolledAt: order.createdAt,
                orderId: order.orderId,
                amountPaid: order.finalAmount
            }));
            
            ResponseHandler.sendSuccess(res, 'Enrolled courses retrieved', enrolledCourses);
        } catch (error) {
            logger.error(`Get user courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/orders
// @desc    Get user's orders
// @access  Private
router.get(
    '/:id/orders',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own orders, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const { Order } = require('../config/db');
            const PaymentService = require('../services/payment.service');
            
            const { page = 1, limit = 10, status } = req.query;
            
            const filters = { userId: id };
            if (status) filters.status = status;
            
            const pagination = { 
                page: parseInt(page), 
                limit: parseInt(limit),
                sortBy: '-createdAt'
            };
            
            const result = await PaymentService.getUserOrders(id, filters, pagination);
            ResponseHandler.sendPaginated(res, 'Orders retrieved', result.orders, result.pagination);
        } catch (error) {
            logger.error(`Get user orders error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/wallet
// @desc    Get user's wallet details
// @access  Private
router.get(
    '/:id/wallet',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own wallet, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const WalletService = require('../services/wallet.service');
            const wallet = await WalletService.getWalletBalance(id);
            
            ResponseHandler.sendSuccess(res, 'Wallet details retrieved', wallet);
        } catch (error) {
            logger.error(`Get user wallet error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/transactions
// @desc    Get user's wallet transactions
// @access  Private
router.get(
    '/:id/transactions',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own transactions, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const WalletService = require('../services/wallet.service');
            
            const { page = 1, limit = 20, type, startDate, endDate } = req.query;
            
            const filters = { type, startDate, endDate };
            const pagination = { 
                page: parseInt(page), 
                limit: parseInt(limit),
                sortBy: '-createdAt'
            };
            
            const result = await WalletService.getWalletTransactions(id, filters, pagination);
            ResponseHandler.sendPaginated(res, 'Transactions retrieved', result.transactions, result.pagination);
        } catch (error) {
            logger.error(`Get user transactions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/withdrawals
// @desc    Get user's withdrawal requests
// @access  Private
router.get(
    '/:id/withdrawals',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own withdrawals, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const { WithdrawRequest } = require('../config/db');
            
            const { page = 1, limit = 10, status } = req.query;
            
            const query = { user: id };
            if (status) query.status = status;
            
            const skip = (page - 1) * limit;
            
            const withdrawals = await WithdrawRequest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const total = await WithdrawRequest.countDocuments(query);
            
            ResponseHandler.sendPaginated(res, 'Withdrawals retrieved', withdrawals, {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error) {
            logger.error(`Get user withdrawals error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/commissions
// @desc    Get user's commissions (for affiliates/instructors)
// @access  Private
router.get(
    '/:id/commissions',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own commissions, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const AffiliateService = require('../services/affiliate.service');
            
            const { page = 1, limit = 20, status, level } = req.query;
            
            const filters = { affiliateId: id, status, level };
            const pagination = { 
                page: parseInt(page), 
                limit: parseInt(limit),
                sortBy: '-createdAt'
            };
            
            const result = await AffiliateService.getAllCommissions(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Commissions retrieved', result.commissions, result.pagination);
        } catch (error) {
            logger.error(`Get user commissions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/referrals
// @desc    Get user's referral network
// @access  Private
router.get(
    '/:id/referrals',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Users can view their own referrals, admin can view any
            if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
                return ResponseHandler.sendForbidden(res, 'Access denied');
            }
            
            const referrals = await User.find({ referredBy: id })
                .select('name email phone role createdAt lastLogin walletBalance')
                .sort({ createdAt: -1 });
            
            // Get referral statistics
            const referralStats = {
                total: referrals.length,
                students: referrals.filter(r => r.role === 'student').length,
                affiliates: referrals.filter(r => r.role === 'affiliate').length,
                instructors: referrals.filter(r => r.role === 'instructor').length,
                active: referrals.filter(r => {
                    if (!r.lastLogin) return false;
                    const daysSinceLogin = (Date.now() - r.lastLogin.getTime()) / (1000 * 60 * 60 * 24);
                    return daysSinceLogin < 30;
                }).length
            };
            
            ResponseHandler.sendSuccess(res, 'Referrals retrieved', {
                referrals,
                stats: referralStats
            });
        } catch (error) {
            logger.error(`Get user referrals error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/:id/activity
// @desc    Get user's recent activity
// @access  Private/Admin
router.get(
    '/:id/activity',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 50 } = req.query;
            
            // Get user's recent activities from various collections
            const [orders, withdrawals, commissions, transactions] = await Promise.all([
                // Recent orders
                Order.find({ user: id })
                    .populate('course', 'title')
                    .sort({ createdAt: -1 })
                    .limit(10),
                
                // Recent withdrawals
                WithdrawRequest.find({ user: id })
                    .sort({ createdAt: -1 })
                    .limit(10),
                
                // Recent commissions
                AffiliateCommission.find({ affiliate: id })
                    .populate('referredUser', 'name')
                    .populate('course', 'title')
                    .sort({ createdAt: -1 })
                    .limit(10),
                
                // Recent wallet transactions
                Transaction.find({ user: id })
                    .sort({ createdAt: -1 })
                    .limit(10)
            ]);
            
            // Combine and sort all activities by date
            const activities = [
                ...orders.map(o => ({
                    type: 'order',
                    description: `Purchased course: ${o.course?.title || 'Unknown'}`,
                    amount: o.finalAmount,
                    date: o.createdAt,
                    status: o.paymentStatus,
                    metadata: { orderId: o.orderId }
                })),
                ...withdrawals.map(w => ({
                    type: 'withdrawal',
                    description: `Withdrawal request: ₹${w.amount}`,
                    amount: w.amount,
                    date: w.createdAt,
                    status: w.status,
                    metadata: { requestId: w.requestId }
                })),
                ...commissions.map(c => ({
                    type: 'commission',
                    description: `Commission earned from ${c.referredUser?.name || 'user'}`,
                    amount: c.commissionAmount,
                    date: c.createdAt,
                    status: c.status,
                    metadata: { commissionId: c.commissionId }
                })),
                ...transactions.map(t => ({
                    type: 'wallet_' + t.type,
                    description: t.description,
                    amount: t.amount,
                    date: t.createdAt,
                    status: t.status,
                    metadata: { transactionId: t.transactionId }
                }))
            ].sort((a, b) => b.date - a.date).slice(0, parseInt(limit));
            
            ResponseHandler.sendSuccess(res, 'User activity retrieved', activities);
        } catch (error) {
            logger.error(`Get user activity error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private/Admin
router.put(
    '/:id/role',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            
            if (!role || !['student', 'instructor', 'affiliate', 'admin'].includes(role)) {
                return ResponseHandler.sendBadRequest(res, 'Invalid role');
            }
            
            // Prevent changing own role from admin
            if (req.user._id.toString() === id && role !== 'admin') {
                return ResponseHandler.sendBadRequest(res, 'Cannot change your own role from admin');
            }
            
            const user = await User.findById(id);
            if (!user) {
                return ResponseHandler.sendNotFound(res, 'User not found');
            }
            
            user.role = role;
            await user.save();
            
            logger.info(`User role updated: ${id} -> ${role} by admin ${req.user._id}`);
            
            ResponseHandler.sendSuccess(res, 'User role updated', {
                userId: id,
                newRole: role
            });
        } catch (error) {
            logger.error(`Update user role error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/users/:id/status
// @desc    Update user status (Admin only)
// @access  Private/Admin
router.put(
    '/:id/status',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            
            if (typeof isActive !== 'boolean') {
                return ResponseHandler.sendBadRequest(res, 'isActive must be boolean');
            }
            
            // Prevent deactivating own account
            if (req.user._id.toString() === id && !isActive) {
                return ResponseHandler.sendBadRequest(res, 'Cannot deactivate your own account');
            }
            
            const user = await User.findById(id);
            if (!user) {
                return ResponseHandler.sendNotFound(res, 'User not found');
            }
            
            user.isActive = isActive;
            await user.save();
            
            logger.info(`User status updated: ${id} -> ${isActive ? 'active' : 'inactive'} by admin ${req.user._id}`);
            
            ResponseHandler.sendSuccess(res, 'User status updated', {
                userId: id,
                isActive
            });
        } catch (error) {
            logger.error(`Update user status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/users/:id/wallet/credit
// @desc    Credit wallet (Admin only)
// @access  Private/Admin
router.post(
    '/:id/wallet/credit',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, description } = req.body;
            
            if (!amount || amount <= 0) {
                return ResponseHandler.sendBadRequest(res, 'Valid amount required');
            }
            
            const WalletService = require('../services/wallet.service');
            const result = await WalletService.adminCreditWallet(
                id, 
                amount, 
                description || 'Admin credit',
                req.user._id
            );
            
            ResponseHandler.sendSuccess(res, 'Wallet credited', result);
        } catch (error) {
            logger.error(`Credit wallet error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/users/:id/wallet/debit
// @desc    Debit wallet (Admin only)
// @access  Private/Admin
router.post(
    '/:id/wallet/debit',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, description } = req.body;
            
            if (!amount || amount <= 0) {
                return ResponseHandler.sendBadRequest(res, 'Valid amount required');
            }
            
            const WalletService = require('../services/wallet.service');
            const result = await WalletService.adminDebitWallet(
                id, 
                amount, 
                description || 'Admin debit',
                req.user._id
            );
            
            ResponseHandler.sendSuccess(res, 'Wallet debited', result);
        } catch (error) {
            logger.error(`Debit wallet error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/search/suggestions
// @desc    Search users for suggestions
// @access  Private/Admin
router.get(
    '/search/suggestions',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { q, limit = 10 } = req.query;
            
            if (!q || q.length < 2) {
                return ResponseHandler.sendSuccess(res, 'Suggestions', []);
            }
            
            const users = await User.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } },
                    { phone: { $regex: q, $options: 'i' } }
                ],
                isActive: true
            })
            .select('name email phone role')
            .limit(parseInt(limit));
            
            ResponseHandler.sendSuccess(res, 'User suggestions', users);
        } catch (error) {
            logger.error(`User search suggestions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/users/stats/overview
// @desc    Get users overview statistics
// @access  Private/Admin
router.get(
    '/stats/overview',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const stats = await User.aggregate([
                {
                    $facet: {
                        totalUsers: [{ $count: 'count' }],
                        activeUsers: [
                            { $match: { isActive: true } },
                            { $count: 'count' }
                        ],
                        usersByRole: [
                            { $group: { _id: '$role', count: { $sum: 1 } } }
                        ],
                        newUsersToday: [
                            { 
                                $match: { 
                                    createdAt: { 
                                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                } 
                            },
                            { $count: 'count' }
                        ],
                        newUsersThisWeek: [
                            { 
                                $match: { 
                                    createdAt: { 
                                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                    }
                                } 
                            },
                            { $count: 'count' }
                        ],
                        newUsersThisMonth: [
                            { 
                                $match: { 
                                    createdAt: { 
                                        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    }
                                } 
                            },
                            { $count: 'count' }
                        ]
                    }
                }
            ]);
            
            ResponseHandler.sendSuccess(res, 'Users overview stats', stats[0] || {});
        } catch (error) {
            logger.error(`Get users overview stats error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;