const { AffiliateCommission, Order, Course, User, Wallet } = require('../config/db');
const { sendEmail } = require('../config/mail');
const logger = require('../utils/logger');
const COMMISSION_STATUS = require('../constants/commissionStatus');

class AffiliateService {
    // Process commission for an order
    static async processCommission(orderId) {
        try {
            const order = await Order.findById(orderId)
                .populate('user')
                .populate('course')
                .populate('referralUsed');

            if (!order) {
                throw new Error('Order not found');
            }

            // Check if commission already processed
            const existingCommission = await AffiliateCommission.findOne({ order: orderId });
            if (existingCommission) {
                logger.warn(`Commission already processed for order: ${orderId}`);
                return existingCommission;
            }

            // Check if referral was used
            if (!order.referralUsed) {
                logger.info(`No referral used for order: ${orderId}`);
                return null;
            }

            // Check if referrer is eligible for commission
            const referrer = await User.findById(order.referralUsed._id);
            if (!referrer || !referrer.isActive || !['affiliate', 'instructor', 'admin'].includes(referrer.role)) {
                logger.warn(`Referrer not eligible for commission: ${order.referralUsed._id}`);
                return null;
            }

            // Calculate commission amount
            const commissionPercentage = order.course.affiliateCommission || COMMISSION_STATUS.DEFAULT_RATES.DIRECT_REFERRAL;
            const commissionAmount = (order.finalAmount * commissionPercentage) / 100;

            // Create commission record
            const commission = new AffiliateCommission({
                commissionId: `COM${Date.now()}${Math.floor(Math.random() * 1000)}`,
                affiliate: referrer._id,
                referredUser: order.user._id,
                order: order._id,
                course: order.course._id,
                commissionAmount: commissionAmount,
                commissionPercentage: commissionPercentage,
                orderAmount: order.finalAmount,
                status: 'pending',
                level: 1,
                metadata: {
                    ipAddress: order.metadata?.ipAddress,
                    userAgent: order.metadata?.userAgent,
                    referralSource: 'direct'
                }
            });

            await commission.save();

            // Process multi-level commissions
            await this.processMultiLevelCommission(order, referrer);

            // Send commission notification
            await sendEmail(referrer.email, 'commissionEarned', {
                name: referrer.name,
                amount: commissionAmount,
                courseTitle: order.course.title
            });

            logger.info(`Commission processed: ${commission._id} for order: ${orderId}`);

            return commission;
        } catch (error) {
            logger.error(`Process commission error: ${error.message}`);
            throw error;
        }
    }

    // Process multi-level commission
    static async processMultiLevelCommission(order, directReferrer) {
        try {
            const levels = {
                2: COMMISSION_STATUS.DEFAULT_RATES.LEVEL_2, // 5%
                3: COMMISSION_STATUS.DEFAULT_RATES.LEVEL_3  // 2%
            };

            let currentAffiliate = directReferrer;

            // Process level 2 (referral of referral)
            if (levels[2] > 0 && currentAffiliate.referredBy) {
                const level2Referrer = await User.findById(currentAffiliate.referredBy);
                if (level2Referrer && level2Referrer.isActive && 
                    ['affiliate', 'instructor', 'admin'].includes(level2Referrer.role)) {
                    
                    const commissionAmount = (order.finalAmount * levels[2]) / 100;

                    const level2Commission = new AffiliateCommission({
                        commissionId: `COM${Date.now()}${Math.floor(Math.random() * 1000)}`,
                        affiliate: level2Referrer._id,
                        referredUser: order.user._id,
                        order: order._id,
                        course: order.course._id,
                        commissionAmount: commissionAmount,
                        commissionPercentage: levels[2],
                        orderAmount: order.finalAmount,
                        status: 'pending',
                        level: 2,
                        metadata: {
                            ipAddress: order.metadata?.ipAddress,
                            userAgent: order.metadata?.userAgent,
                            referralSource: 'indirect'
                        }
                    });

                    await level2Commission.save();

                    // Send notification for level 2
                    await sendEmail(level2Referrer.email, 'commissionEarned', {
                        name: level2Referrer.name,
                        amount: commissionAmount,
                        courseTitle: order.course.title
                    });

                    currentAffiliate = level2Referrer;
                }
            }

            // Process level 3 (third level)
            if (levels[3] > 0 && currentAffiliate.referredBy) {
                const level3Referrer = await User.findById(currentAffiliate.referredBy);
                if (level3Referrer && level3Referrer.isActive && 
                    ['affiliate', 'instructor', 'admin'].includes(level3Referrer.role)) {
                    
                    const commissionAmount = (order.finalAmount * levels[3]) / 100;

                    const level3Commission = new AffiliateCommission({
                        commissionId: `COM${Date.now()}${Math.floor(Math.random() * 1000)}`,
                        affiliate: level3Referrer._id,
                        referredUser: order.user._id,
                        order: order._id,
                        course: order.course._id,
                        commissionAmount: commissionAmount,
                        commissionPercentage: levels[3],
                        orderAmount: order.finalAmount,
                        status: 'pending',
                        level: 3,
                        metadata: {
                            ipAddress: order.metadata?.ipAddress,
                            userAgent: order.metadata?.userAgent,
                            referralSource: 'indirect'
                        }
                    });

                    await level3Commission.save();

                    // Send notification for level 3
                    await sendEmail(level3Referrer.email, 'commissionEarned', {
                        name: level3Referrer.name,
                        amount: commissionAmount,
                        courseTitle: order.course.title
                    });
                }
            }

            logger.info(`Multi-level commissions processed for order: ${order._id}`);
        } catch (error) {
            logger.error(`Process multi-level commission error: ${error.message}`);
            // Don't throw error to avoid failing the main commission process
        }
    }

    // Get affiliate dashboard data
    static async getAffiliateDashboard(affiliateId) {
        try {
            const affiliate = await User.findById(affiliateId);
            if (!affiliate) {
                throw new Error('Affiliate not found');
            }

            // Get commission statistics
            const commissionStats = await AffiliateCommission.getAffiliateStats(affiliateId);

            // Get referral statistics
            const referralStats = await this.getReferralStats(affiliateId);

            // Get recent commissions
            const recentCommissions = await AffiliateCommission.find({ affiliate: affiliateId })
                .populate('referredUser', 'name email')
                .populate('course', 'title thumbnail')
                .sort({ createdAt: -1 })
                .limit(10);

            // Get top performing referrals
            const topReferrals = await this.getTopReferrals(affiliateId);

            // Get earnings trend
            const earningsTrend = await this.getEarningsTrend(affiliateId);

            return {
                affiliate: {
                    _id: affiliate._id,
                    name: affiliate.name,
                    email: affiliate.email,
                    referralCode: affiliate.referralCode,
                    walletBalance: affiliate.walletBalance,
                    totalEarned: affiliate.totalEarned,
                    totalWithdrawn: affiliate.totalWithdrawn
                },
                stats: {
                    commissions: commissionStats,
                    referrals: referralStats,
                    totalEarned: commissionStats.total?.totalEarned || 0,
                    pendingAmount: commissionStats.total?.pendingAmount || 0,
                    approvedAmount: commissionStats.total?.approvedAmount || 0,
                    paidAmount: commissionStats.total?.paidAmount || 0
                },
                recentCommissions,
                topReferrals,
                earningsTrend,
                referralLink: `${process.env.FRONTEND_URL}/signup?ref=${affiliate.referralCode}`
            };
        } catch (error) {
            logger.error(`Get affiliate dashboard error: ${error.message}`);
            throw error;
        }
    }

    // Get referral statistics
    static async getReferralStats(affiliateId) {
        try {
            const referrals = await User.find({ referredBy: affiliateId });

            const stats = {
                total: referrals.length,
                converted: 0,
                pending: 0,
                active: 0
            };

            // Check conversion status for each referral
            for (const referral of referrals) {
                // Check if referral has made any purchase
                const orders = await Order.countDocuments({
                    user: referral._id,
                    paymentStatus: 'completed'
                });

                if (orders > 0) {
                    stats.converted++;
                }

                // Check if referral is active (logged in recently)
                if (referral.lastLogin) {
                    const daysSinceLogin = (Date.now() - referral.lastLogin.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysSinceLogin < 30) {
                        stats.active++;
                    }
                }
            }

            stats.pending = stats.total - stats.converted;

            return stats;
        } catch (error) {
            logger.error(`Get referral stats error: ${error.message}`);
            return {
                total: 0,
                converted: 0,
                pending: 0,
                active: 0
            };
        }
    }

    // Get top performing referrals
    static async getTopReferrals(affiliateId, limit = 5) {
        try {
            const referrals = await User.find({ referredBy: affiliateId })
                .select('name email createdAt lastLogin');

            const referralsWithStats = await Promise.all(
                referrals.map(async (referral) => {
                    // Get total purchases by referral
                    const orders = await Order.find({
                        user: referral._id,
                        paymentStatus: 'completed'
                    }).populate('course', 'title price');

                    const totalSpent = orders.reduce((sum, order) => sum + order.finalAmount, 0);
                    const totalCommissions = await AffiliateCommission.find({
                        affiliate: affiliateId,
                        referredUser: referral._id,
                        status: { $in: ['approved', 'paid'] }
                    });

                    const totalEarned = totalCommissions.reduce((sum, comm) => sum + comm.commissionAmount, 0);

                    return {
                        user: referral,
                        totalOrders: orders.length,
                        totalSpent,
                        totalCommissions: totalCommissions.length,
                        totalEarned,
                        lastPurchase: orders.length > 0 ? orders[0].createdAt : null
                    };
                })
            );

            // Sort by total earned
            return referralsWithStats
                .sort((a, b) => b.totalEarned - a.totalEarned)
                .slice(0, limit);
        } catch (error) {
            logger.error(`Get top referrals error: ${error.message}`);
            return [];
        }
    }

    // Get earnings trend
    static async getEarningsTrend(affiliateId, period = 'monthly') {
        try {
            const now = new Date();
            let startDate;
            let groupFormat;

            switch (period) {
                case 'daily':
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    groupFormat = '%Y-%m-%d';
                    break;
                case 'weekly':
                    startDate = new Date(now.setDate(now.getDate() - 90));
                    groupFormat = '%Y-%U';
                    break;
                case 'monthly':
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                    groupFormat = '%Y-%m';
                    break;
                default:
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                    groupFormat = '%Y-%m';
            }

            const trend = await AffiliateCommission.aggregate([
                {
                    $match: {
                        affiliate: affiliateId,
                        status: { $in: ['approved', 'paid'] },
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: groupFormat, date: '$createdAt' }
                        },
                        totalEarned: { $sum: '$commissionAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return trend;
        } catch (error) {
            logger.error(`Get earnings trend error: ${error.message}`);
            return [];
        }
    }

    // Approve commission (admin)
    static async approveCommission(commissionId, adminId, notes = '') {
        try {
            const commission = await AffiliateCommission.findById(commissionId);
            if (!commission) {
                throw new Error('Commission not found');
            }

            if (commission.status !== 'pending') {
                throw new Error(`Commission is already ${commission.status}`);
            }

            // Approve commission
            await commission.approveCommission(notes);

            // Credit to affiliate's wallet
            const affiliate = await User.findById(commission.affiliate);
            if (affiliate) {
                affiliate.walletBalance += commission.commissionAmount;
                affiliate.totalEarned += commission.commissionAmount;
                await affiliate.save({ validateBeforeSave: false });
            }

            // Update wallet
            const wallet = await Wallet.findOne({ user: commission.affiliate });
            if (wallet) {
                wallet.balance += commission.commissionAmount;
                wallet.totalEarned += commission.commissionAmount;
                wallet.lastTransactionAt = new Date();
                await wallet.save();
            }

            // Send notification
            await sendEmail(affiliate.email, 'commissionApproved', {
                name: affiliate.name,
                amount: commission.commissionAmount,
                commissionId: commission.commissionId
            });

            logger.info(`Commission approved: ${commissionId} by admin: ${adminId}`);

            return commission;
        } catch (error) {
            logger.error(`Approve commission error: ${error.message}`);
            throw error;
        }
    }

    // Reject commission (admin)
    static async rejectCommission(commissionId, adminId, reason = '') {
        try {
            const commission = await AffiliateCommission.findById(commissionId);
            if (!commission) {
                throw new Error('Commission not found');
            }

            if (commission.status !== 'pending') {
                throw new Error(`Commission is already ${commission.status}`);
            }

            // Reject commission
            await commission.rejectCommission(reason);

            // Send notification
            const affiliate = await User.findById(commission.affiliate);
            if (affiliate) {
                await sendEmail(affiliate.email, 'commissionRejected', {
                    name: affiliate.name,
                    amount: commission.commissionAmount,
                    commissionId: commission.commissionId,
                    reason: reason
                });
            }

            logger.info(`Commission rejected: ${commissionId} by admin: ${adminId}`);

            return commission;
        } catch (error) {
            logger.error(`Reject commission error: ${error.message}`);
            throw error;
        }
    }

    // Get all commissions with filters (admin)
    static async getAllCommissions(filters = {}, pagination = {}) {
        try {
            const {
                affiliateId,
                status,
                level,
                startDate,
                endDate,
                minAmount,
                maxAmount,
                search
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = '-createdAt'
            } = pagination;

            const query = {};

            // Filter by affiliate
            if (affiliateId) {
                query.affiliate = affiliateId;
            }

            // Filter by status
            if (status) {
                query.status = status;
            }

            // Filter by level
            if (level) {
                query.level = level;
            }

            // Filter by amount range
            if (minAmount || maxAmount) {
                query.commissionAmount = {};
                if (minAmount) query.commissionAmount.$gte = minAmount;
                if (maxAmount) query.commissionAmount.$lte = maxAmount;
            }

            // Date range filter
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            // Search by affiliate name or email
            if (search) {
                const affiliates = await User.find({
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                }).select('_id');

                query.affiliate = { $in: affiliates.map(a => a._id) };
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute query
            const commissions = await AffiliateCommission.find(query)
                .populate('affiliate', 'name email referralCode')
                .populate('referredUser', 'name email')
                .populate('course', 'title thumbnail')
                .populate('order', 'orderId finalAmount')
                .sort(sortBy)
                .skip(skip)
                .limit(limit);

            // Get total count
            const total = await AffiliateCommission.countDocuments(query);

            return {
                commissions,
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
            logger.error(`Get all commissions error: ${error.message}`);
            throw error;
        }
    }

    // Get commission statistics (admin)
    static async getCommissionStats(timeframe = 'monthly') {
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

            const stats = await AffiliateCommission.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $facet: {
                        // Overall statistics
                        overall: [
                            {
                                $group: {
                                    _id: null,
                                    totalCommissions: { $sum: 1 },
                                    totalAmount: { $sum: '$commissionAmount' },
                                    avgCommission: { $avg: '$commissionAmount' },
                                    maxCommission: { $max: '$commissionAmount' },
                                    minCommission: { $min: '$commissionAmount' }
                                }
                            }
                        ],

                        // By status
                        byStatus: [
                            {
                                $group: {
                                    _id: '$status',
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$commissionAmount' }
                                }
                            }
                        ],

                        // By level
                        byLevel: [
                            {
                                $group: {
                                    _id: '$level',
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$commissionAmount' }
                                }
                            }
                        ],

                        // By affiliate
                        topAffiliates: [
                            {
                                $group: {
                                    _id: '$affiliate',
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$commissionAmount' }
                                }
                            },
                            { $sort: { totalAmount: -1 } },
                            { $limit: 10 }
                        ],

                        // Daily trend
                        dailyTrend: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$commissionAmount' }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ],

                        // Monthly trend
                        monthlyTrend: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$commissionAmount' }
                                }
                            },
                            { $sort: { _id: 1 } }
                        ]
                    }
                }
            ]);

            // Populate affiliate details for top affiliates
            if (stats[0]?.topAffiliates?.length > 0) {
                const affiliateIds = stats[0].topAffiliates.map(item => item._id);
                const affiliates = await User.find({ _id: { $in: affiliateIds } })
                    .select('name email referralCode');

                const affiliateMap = affiliates.reduce((map, affiliate) => {
                    map[affiliate._id.toString()] = affiliate;
                    return map;
                }, {});

                stats[0].topAffiliates = stats[0].topAffiliates.map(item => ({
                    ...item,
                    affiliate: affiliateMap[item._id.toString()] || { _id: item._id }
                }));
            }

            return stats[0] || {};
        } catch (error) {
            logger.error(`Get commission stats error: ${error.message}`);
            throw error;
        }
    }

    // Generate affiliate report
    static async generateAffiliateReport(affiliateId, startDate, endDate) {
        try {
            const affiliate = await User.findById(affiliateId);
            if (!affiliate) {
                throw new Error('Affiliate not found');
            }

            // Get commissions in date range
            const commissions = await AffiliateCommission.find({
                affiliate: affiliateId,
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            })
                .populate('referredUser', 'name email')
                .populate('course', 'title')
                .populate('order', 'orderId finalAmount');

            // Get referrals
            const referrals = await User.find({
                referredBy: affiliateId,
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }).select('name email phone createdAt lastLogin');

            // Calculate statistics
            const stats = COMMISSION_STATUS.calculateStats(commissions);

            // Generate report
            const report = {
                affiliate: {
                    name: affiliate.name,
                    email: affiliate.email,
                    referralCode: affiliate.referralCode
                },
                period: {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                },
                summary: {
                    totalCommissions: commissions.length,
                    totalEarned: stats.totalAmount,
                    totalReferrals: referrals.length,
                    convertedReferrals: referrals.filter(r => {
                        // Check if referral made any purchase
                        // This would require checking orders
                        return false; // Implement based on your logic
                    }).length
                },
                commissions: commissions.map(comm => ({
                    id: comm.commissionId,
                    date: comm.createdAt,
                    referredUser: comm.referredUser?.name || 'N/A',
                    course: comm.course?.title || 'N/A',
                    orderId: comm.order?.orderId || 'N/A',
                    orderAmount: comm.orderAmount,
                    commissionPercentage: comm.commissionPercentage,
                    commissionAmount: comm.commissionAmount,
                    status: comm.status,
                    level: comm.level
                })),
                referrals: referrals.map(ref => ({
                    name: ref.name,
                    email: ref.email,
                    joinedDate: ref.createdAt,
                    lastActive: ref.lastLogin,
                    status: 'active' // Determine based on activity
                })),
                dailyBreakdown: COMMISSION_STATUS.generateReport(commissions, 'daily')
            };

            return report;
        } catch (error) {
            logger.error(`Generate affiliate report error: ${error.message}`);
            throw error;
        }
    }

    // Update commission settings (admin)
    static async updateCommissionSettings(settings) {
        try {
            // This would typically update settings in database
            // For now, we'll return the settings
            
            const defaultSettings = {
                directCommissionRate: 10,
                level2CommissionRate: 5,
                level3CommissionRate: 2,
                minPayoutAmount: 100,
                payoutFrequency: 'weekly',
                holdPeriod: 7,
                autoApproveThreshold: 1000
            };

            const updatedSettings = { ...defaultSettings, ...settings };

            logger.info(`Commission settings updated: ${JSON.stringify(updatedSettings)}`);

            return {
                success: true,
                message: 'Commission settings updated',
                settings: updatedSettings
            };
        } catch (error) {
            logger.error(`Update commission settings error: ${error.message}`);
            throw error;
        }
    }

    // Check commission eligibility
    static async checkEligibility(affiliateId, courseId) {
        try {
            const affiliate = await User.findById(affiliateId);
            if (!affiliate || !affiliate.isActive) {
                return { eligible: false, reason: 'Affiliate account is not active' };
            }

            const course = await Course.findById(courseId);
            if (!course) {
                return { eligible: false, reason: 'Course not found' };
            }

            if (course.affiliateCommission <= 0) {
                return { eligible: false, reason: 'Course does not offer affiliate commissions' };
            }

            // Check if affiliate has already referred this course to this user
            // This would require tracking referrals

            return {
                eligible: true,
                commissionRate: course.affiliateCommission,
                courseTitle: course.title,
                coursePrice: course.finalPrice
            };
        } catch (error) {
            logger.error(`Check eligibility error: ${error.message}`);
            return { eligible: false, reason: 'Error checking eligibility' };
        }
    }
}

module.exports = AffiliateService;