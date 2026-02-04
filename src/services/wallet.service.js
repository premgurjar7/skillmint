const { Wallet, Transaction, User, Order } = require('../config/db');
const { sendEmail } = require('../config/mail');
const logger = require('../utils/logger');

class WalletService {
    // Get wallet balance
    static async getWalletBalance(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get or create wallet
            let wallet = await Wallet.findOne({ user: userId });
            
            if (!wallet) {
                wallet = new Wallet({
                    user: userId,
                    balance: user.walletBalance || 0,
                    totalEarned: user.totalEarned || 0,
                    totalWithdrawn: user.totalWithdrawn || 0
                });
                await wallet.save();
            }

            // Get recent transactions
            const recentTransactions = await Transaction.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(10);

            return {
                wallet: {
                    balance: wallet.balance,
                    totalEarned: wallet.totalEarned,
                    totalWithdrawn: wallet.totalWithdrawn,
                    pendingWithdrawals: wallet.pendingWithdrawals,
                    currency: wallet.currency,
                    lastTransactionAt: wallet.lastTransactionAt
                },
                user: {
                    name: user.name,
                    email: user.email,
                    walletBalance: user.walletBalance
                },
                recentTransactions
            };
        } catch (error) {
            logger.error(`Get wallet balance error: ${error.message}`);
            throw error;
        }
    }

    // Get wallet transactions
    static async getWalletTransactions(userId, filters = {}, pagination = {}) {
        try {
            const {
                type,
                referenceType,
                startDate,
                endDate,
                minAmount,
                maxAmount
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = '-createdAt'
            } = pagination;

            const query = { user: userId };

            // Filter by transaction type
            if (type) {
                query.type = type;
            }

            // Filter by reference type
            if (referenceType) {
                query.referenceType = referenceType;
            }

            // Filter by amount range
            if (minAmount || maxAmount) {
                query.amount = {};
                if (minAmount) query.amount.$gte = minAmount;
                if (maxAmount) query.amount.$lte = maxAmount;
            }

            // Date range filter
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute query
            const transactions = await Transaction.find(query)
                .populate('referenceId')
                .sort(sortBy)
                .skip(skip)
                .limit(limit);

            // Get total count
            const total = await Transaction.countDocuments(query);

            return {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            logger.error(`Get wallet transactions error: ${error.message}`);
            throw error;
        }
    }

    // Add funds to wallet
    static async addFunds(userId, amount, paymentMethod, transactionData = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get or create wallet
            let wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                wallet = new Wallet({ user: userId });
            }

            // Add credit to wallet
            const transaction = await wallet.addCredit(
                amount,
                `Wallet top-up via ${paymentMethod}`,
                {
                    referenceType: 'wallet_topup',
                    referenceId: transactionData.referenceId,
                    referenceModel: 'Transaction',
                    metadata: {
                        paymentMethod: paymentMethod,
                        ...transactionData.metadata
                    }
                }
            );

            // Update user's wallet balance
            user.walletBalance += amount;
            await user.save({ validateBeforeSave: false });

            // Send confirmation email
            await sendEmail(user.email, 'walletCredited', {
                name: user.name,
                amount: amount,
                newBalance: user.walletBalance,
                paymentMethod: paymentMethod
            });

            logger.info(`Funds added to wallet: ${amount} for user: ${userId}`);

            return {
                success: true,
                amount: amount,
                newBalance: user.walletBalance,
                transactionId: transaction.transactionId
            };
        } catch (error) {
            logger.error(`Add funds error: ${error.message}`);
            throw error;
        }
    }

    // Deduct funds from wallet
    static async deductFunds(userId, amount, description, reference) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check sufficient balance
            if (user.walletBalance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            // Get wallet
            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Add debit transaction
            const transaction = await wallet.addDebit(amount, description, reference);

            // Update user's wallet balance
            user.walletBalance -= amount;
            await user.save({ validateBeforeSave: false });

            logger.info(`Funds deducted from wallet: ${amount} for user: ${userId}`);

            return {
                success: true,
                amount: amount,
                newBalance: user.walletBalance,
                transactionId: transaction.transactionId
            };
        } catch (error) {
            logger.error(`Deduct funds error: ${error.message}`);
            throw error;
        }
    }

    // Transfer funds between wallets
    static async transferFunds(fromUserId, toUserId, amount, description = '') {
        try {
            // Check if transferring to same user
            if (fromUserId.toString() === toUserId.toString()) {
                throw new Error('Cannot transfer to yourself');
            }

            // Get sender details
            const sender = await User.findById(fromUserId);
            if (!sender) {
                throw new Error('Sender not found');
            }

            // Check sender's balance
            if (sender.walletBalance < amount) {
                throw new Error('Insufficient balance');
            }

            // Get receiver details
            const receiver = await User.findById(toUserId);
            if (!receiver) {
                throw new Error('Receiver not found');
            }

            // Deduct from sender
            await this.deductFunds(
                fromUserId,
                amount,
                `Transfer to ${receiver.name}`,
                {
                    referenceType: 'fund_transfer',
                    referenceId: toUserId,
                    referenceModel: 'User'
                }
            );

            // Add to receiver
            await this.addFunds(
                toUserId,
                amount,
                'wallet_transfer',
                {
                    referenceId: fromUserId,
                    metadata: {
                        fromUser: fromUserId,
                        description: description || `Transfer from ${sender.name}`
                    }
                }
            );

            // Send notifications
            await sendEmail(sender.email, 'fundsTransferred', {
                name: sender.name,
                amount: amount,
                toUser: receiver.name,
                newBalance: sender.walletBalance - amount
            });

            await sendEmail(receiver.email, 'fundsReceived', {
                name: receiver.name,
                amount: amount,
                fromUser: sender.name,
                newBalance: receiver.walletBalance + amount
            });

            logger.info(`Funds transferred: ${amount} from ${fromUserId} to ${toUserId}`);

            return {
                success: true,
                amount: amount,
                fromUser: {
                    id: sender._id,
                    name: sender.name,
                    newBalance: sender.walletBalance - amount
                },
                toUser: {
                    id: receiver._id,
                    name: receiver.name,
                    newBalance: receiver.walletBalance + amount
                }
            };
        } catch (error) {
            logger.error(`Transfer funds error: ${error.message}`);
            throw error;
        }
    }

    // Get wallet statistics
    static async getWalletStats(userId = null, timeframe = 'monthly') {
        try {
            const now = new Date();
            let startDate;

            switch (timeframe) {
                case 'daily':
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    break;
                case 'weekly':
                    startDate = new Date(now.setDate(now.getDate() - 90));
                    break;
                case 'monthly':
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear() - 5, 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            }

            const matchStage = { createdAt: { $gte: startDate } };
            if (userId) {
                matchStage.user = userId;
            }

            const stats = await Transaction.aggregate([
                { $match: matchStage },
                {
                    $facet: {
                        // Overall statistics
                        overall: [
                            {
                                $group: {
                                    _id: null,
                                    totalTransactions: { $sum: 1 },
                                    totalCredits: {
                                        $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                                    },
                                    totalDebits: {
                                        $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                                    },
                                    avgTransaction: { $avg: '$amount' },
                                    maxTransaction: { $max: '$amount' },
                                    minTransaction: { $min: '$amount' }
                                }
                            }
                        ],

                        // By type
                        byType: [
                            {
                                $group: {
                                    _id: '$type',
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$amount' }
                                }
                            }
                        ],

                        // By reference type
                        byReferenceType: [
                            {
                                $group: {
                                    _id: '$referenceType',
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$amount' }
                                }
                            },
                            { $sort: { totalAmount: -1 } }
                        ],

                        // Daily trend
                        dailyTrend: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                    credits: {
                                        $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                                    },
                                    debits: {
                                        $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                                    },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],

                        // Monthly trend
                        monthlyTrend: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                                    credits: {
                                        $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                                    },
                                    debits: {
                                        $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                                    },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],

                        // Top transactions
                        topTransactions: [
                            { $sort: { amount: -1 } },
                            { $limit: 10 }
                        ]
                    }
                }
            ]);

            // Calculate net flow
            if (stats[0]?.overall?.length > 0) {
                const overall = stats[0].overall[0];
                overall.netFlow = overall.totalCredits - overall.totalDebits;
            }

            return stats[0] || {};
        } catch (error) {
            logger.error(`Get wallet stats error: ${error.message}`);
            throw error;
        }
    }

    // Export wallet transactions
    static async exportTransactions(userId, format = 'csv', filters = {}) {
        try {
            const query = { user: userId };

            // Apply filters
            if (filters.startDate || filters.endDate) {
                query.createdAt = {};
                if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
                if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
            }

            if (filters.type) {
                query.type = filters.type;
            }

            // Get transactions
            const transactions = await Transaction.find(query)
                .sort({ createdAt: -1 });

            // Get user details
            const user = await User.findById(userId).select('name email');

            // Format data based on export format
            if (format === 'csv') {
                const headers = [
                    'Transaction ID',
                    'Date',
                    'Type',
                    'Amount',
                    'Description',
                    'Reference Type',
                    'Balance After',
                    'Status'
                ];

                const csvData = transactions.map(t => [
                    t.transactionId,
                    t.createdAt.toISOString(),
                    t.type,
                    t.amount,
                    t.description,
                    t.referenceType,
                    t.balanceAfter,
                    t.status
                ]);

                return {
                    format: 'csv',
                    filename: `wallet_transactions_${userId}_${Date.now()}.csv`,
                    headers,
                    data: csvData,
                    user: user,
                    count: transactions.length
                };
            } else if (format === 'json') {
                return {
                    format: 'json',
                    filename: `wallet_transactions_${userId}_${Date.now()}.json`,
                    data: transactions,
                    user: user,
                    count: transactions.length
                };
            }

            throw new Error(`Unsupported format: ${format}`);
        } catch (error) {
            logger.error(`Export transactions error: ${error.message}`);
            throw error;
        }
    }

    // Admin: Get all wallets
    static async getAllWallets(filters = {}, pagination = {}) {
        try {
            const {
                search,
                minBalance,
                maxBalance,
                userRole
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = '-balance'
            } = pagination;

            // Build user query for search
            let userQuery = {};
            if (search) {
                userQuery = {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { phone: { $regex: search, $options: 'i' } }
                    ]
                };
            }

            if (userRole) {
                userQuery.role = userRole;
            }

            // Get users matching query
            const users = await User.find(userQuery).select('_id');
            const userIds = users.map(u => u._id);

            // Build wallet query
            const walletQuery = { user: { $in: userIds } };

            if (minBalance || maxBalance) {
                walletQuery.balance = {};
                if (minBalance) walletQuery.balance.$gte = minBalance;
                if (maxBalance) walletQuery.balance.$lte = maxBalance;
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute query
            const wallets = await Wallet.find(walletQuery)
                .populate('user', 'name email phone role')
                .sort(sortBy)
                .skip(skip)
                .limit(limit);

            // Get total count
            const total = await Wallet.countDocuments(walletQuery);

            return {
                wallets,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            logger.error(`Get all wallets error: ${error.message}`);
            throw error;
        }
    }

    // Admin: Credit wallet
    static async adminCreditWallet(userId, amount, description, adminId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Add funds
            const result = await this.addFunds(
                userId,
                amount,
                'admin_credit',
                {
                    referenceId: adminId,
                    metadata: {
                        adminId: adminId,
                        description: description || 'Admin credit'
                    }
                }
            );

            // Log admin action
            logger.info(`Admin ${adminId} credited ${amount} to wallet of user ${userId}`);

            return {
                success: true,
                message: 'Wallet credited successfully',
                ...result
            };
        } catch (error) {
            logger.error(`Admin credit wallet error: ${error.message}`);
            throw error;
        }
    }

    // Admin: Debit wallet
    static async adminDebitWallet(userId, amount, description, adminId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check sufficient balance
            if (user.walletBalance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct funds
            const result = await this.deductFunds(
                userId,
                amount,
                description || 'Admin debit',
                {
                    referenceType: 'admin_debit',
                    referenceId: adminId,
                    referenceModel: 'User',
                    metadata: {
                        adminId: adminId
                    }
                }
            );

            // Log admin action
            logger.info(`Admin ${adminId} debited ${amount} from wallet of user ${userId}`);

            return {
                success: true,
                message: 'Wallet debited successfully',
                ...result
            };
        } catch (error) {
            logger.error(`Admin debit wallet error: ${error.message}`);
            throw error;
        }
    }

    // Get wallet summary
    static async getWalletSummary(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Get today's transactions
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todaysTransactions = await Transaction.find({
                user: userId,
                createdAt: { $gte: today }
            }).sort({ createdAt: -1 });

            // Get monthly summary
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthlySummary = await Transaction.aggregate([
                {
                    $match: {
                        user: userId,
                        createdAt: { $gte: monthStart }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCredits: {
                            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                        },
                        totalDebits: {
                            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                        },
                        transactionCount: { $sum: 1 }
                    }
                }
            ]);

            // Get top spending categories
            const topCategories = await Transaction.aggregate([
                {
                    $match: {
                        user: userId,
                        type: 'debit'
                    }
                },
                {
                    $group: {
                        _id: '$referenceType',
                        totalSpent: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 5 }
            ]);

            return {
                wallet: {
                    balance: wallet.balance,
                    totalEarned: wallet.totalEarned,
                    totalWithdrawn: wallet.totalWithdrawn
                },
                todaysTransactions,
                monthlySummary: monthlySummary[0] || {
                    totalCredits: 0,
                    totalDebits: 0,
                    transactionCount: 0
                },
                topCategories,
                user: {
                    name: user.name,
                    email: user.email
                }
            };
        } catch (error) {
            logger.error(`Get wallet summary error: ${error.message}`);
            throw error;
        }
    }

    // Validate wallet transaction
    static async validateTransaction(transactionId) {
        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Check if transaction is valid
            const isValid = transaction.status === 'completed';
            
            // Verify balance consistency
            const wallet = await Wallet.findOne({ user: transaction.user });
            const isConsistent = wallet ? 
                Math.abs(wallet.balance - transaction.balanceAfter) < 0.01 : true;

            return {
                transactionId: transaction._id,
                isValid,
                isConsistent,
                details: {
                    user: transaction.user,
                    type: transaction.type,
                    amount: transaction.amount,
                    description: transaction.description,
                    status: transaction.status,
                    createdAt: transaction.createdAt
                }
            };
        } catch (error) {
            logger.error(`Validate transaction error: ${error.message}`);
            throw error;
        }
    }

    // Reconcile wallet balance
    static async reconcileWallet(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Calculate expected balance from transactions
            const transactions = await Transaction.find({ user: userId });
            
            let calculatedBalance = 0;
            transactions.forEach(t => {
                if (t.type === 'credit' && t.status === 'completed') {
                    calculatedBalance += t.amount;
                } else if (t.type === 'debit' && t.status === 'completed') {
                    calculatedBalance -= t.amount;
                }
            });

            // Compare with current balance
            const discrepancy = Math.abs(wallet.balance - calculatedBalance);
            const isBalanced = discrepancy < 0.01; // Allow for floating point errors

            if (!isBalanced) {
                // Log discrepancy
                logger.warn(`Wallet imbalance detected for user ${userId}: ` +
                    `Wallet balance: ${wallet.balance}, Calculated: ${calculatedBalance}`);

                // Optionally, auto-correct the balance
                // wallet.balance = calculatedBalance;
                // await wallet.save();
            }

            return {
                userId,
                walletBalance: wallet.balance,
                calculatedBalance,
                discrepancy,
                isBalanced,
                transactionCount: transactions.length
            };
        } catch (error) {
            logger.error(`Reconcile wallet error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = WalletService;