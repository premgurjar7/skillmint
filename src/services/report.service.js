const { User, Course, Order, AffiliateCommission, WithdrawRequest, Wallet, Transaction } = require('../config/db');
const logger = require('../utils/logger');
const moment = require('moment');

class ReportService {
    // Generate sales report
    static async generateSalesReport(startDate, endDate, filters = {}) {
        try {
            const { courseId, instructorId, paymentMethod } = filters;
            
            const matchStage = {
                paymentStatus: 'completed',
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            if (courseId) matchStage.course = courseId;
            if (instructorId) {
                // Find courses by instructor
                const courses = await Course.find({ instructor: instructorId }).select('_id');
                matchStage.course = { $in: courses.map(c => c._id) };
            }
            if (paymentMethod) matchStage.paymentMethod = paymentMethod;

            const salesData = await Order.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'courses',
                        localField: 'course',
                        foreignField: '_id',
                        as: 'courseDetails'
                    }
                },
                { $unwind: '$courseDetails' },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'courseDetails.instructor',
                        foreignField: '_id',
                        as: 'instructorDetails'
                    }
                },
                { $unwind: '$instructorDetails' },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            courseId: '$course',
                            courseTitle: '$courseDetails.title',
                            instructorId: '$instructorDetails._id',
                            instructorName: '$instructorDetails.name'
                        },
                        totalSales: { $sum: '$finalAmount' },
                        totalOrders: { $sum: 1 },
                        avgOrderValue: { $avg: '$finalAmount' },
                        minOrderValue: { $min: '$finalAmount' },
                        maxOrderValue: { $max: '$finalAmount' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        courseId: '$_id.courseId',
                        courseTitle: '$_id.courseTitle',
                        instructorId: '$_id.instructorId',
                        instructorName: '$_id.instructorName',
                        totalSales: 1,
                        totalOrders: 1,
                        avgOrderValue: { $round: ['$avgOrderValue', 2] },
                        minOrderValue: 1,
                        maxOrderValue: 1
                    }
                },
                { $sort: { date: 1 } }
            ]);

            // Calculate summary
            const summary = {
                totalSales: salesData.reduce((sum, item) => sum + item.totalSales, 0),
                totalOrders: salesData.reduce((sum, item) => sum + item.totalOrders, 0),
                avgDailySales: salesData.length > 0 ? 
                    salesData.reduce((sum, item) => sum + item.totalSales, 0) / salesData.length : 0,
                topCourses: [],
                topInstructors: []
            };

            // Group by course for top courses
            const courseSales = salesData.reduce((acc, item) => {
                if (!acc[item.courseId]) {
                    acc[item.courseId] = {
                        courseId: item.courseId,
                        courseTitle: item.courseTitle,
                        totalSales: 0,
                        totalOrders: 0
                    };
                }
                acc[item.courseId].totalSales += item.totalSales;
                acc[item.courseId].totalOrders += item.totalOrders;
                return acc;
            }, {});

            summary.topCourses = Object.values(courseSales)
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, 10);

            // Group by instructor for top instructors
            const instructorSales = salesData.reduce((acc, item) => {
                if (!acc[item.instructorId]) {
                    acc[item.instructorId] = {
                        instructorId: item.instructorId,
                        instructorName: item.instructorName,
                        totalSales: 0,
                        totalOrders: 0,
                        courses: new Set()
                    };
                }
                acc[item.instructorId].totalSales += item.totalSales;
                acc[item.instructorId].totalOrders += item.totalOrders;
                acc[item.instructorId].courses.add(item.courseTitle);
                return acc;
            }, {});

            summary.topInstructors = Object.values(instructorSales)
                .map(instructor => ({
                    ...instructor,
                    courses: Array.from(instructor.courses),
                    courseCount: instructor.courses.size
                }))
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, 10);

            logger.info(`Sales report generated for ${startDate} to ${endDate}`);

            return {
                period: { startDate, endDate },
                summary,
                dailyData: salesData,
                filtersApplied: filters
            };
        } catch (error) {
            logger.error(`Generate sales report error: ${error.message}`);
            throw error;
        }
    }

    // Generate user growth report
    static async generateUserGrowthReport(startDate, endDate, filters = {}) {
        try {
            const { role, isActive, isEmailVerified } = filters;
            
            const matchStage = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            if (role) matchStage.role = role;
            if (isActive !== undefined) matchStage.isActive = isActive;
            if (isEmailVerified !== undefined) matchStage.isEmailVerified = isEmailVerified;

            const userData = await User.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            role: '$role'
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: '$_id.date',
                        total: { $sum: '$count' },
                        byRole: {
                            $push: {
                                role: '$_id.role',
                                count: '$count'
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        total: 1,
                        byRole: 1
                    }
                },
                { $sort: { date: 1 } }
            ]);

            // Calculate cumulative growth
            let cumulativeTotal = 0;
            const cumulativeData = userData.map(day => {
                cumulativeTotal += day.total;
                return {
                    date: day.date,
                    daily: day.total,
                    cumulative: cumulativeTotal,
                    byRole: day.byRole
                };
            });

            // Get user statistics
            const userStats = await User.aggregate([
                {
                    $facet: {
                        totalUsers: [{ $count: 'count' }],
                        byRole: [
                            { $group: { _id: '$role', count: { $sum: 1 } } }
                        ],
                        byStatus: [
                            { $group: { _id: '$isActive', count: { $sum: 1 } } }
                        ],
                        byVerification: [
                            { $group: { _id: '$isEmailVerified', count: { $sum: 1 } } }
                        ],
                        recentActivity: [
                            {
                                $match: {
                                    lastLogin: {
                                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                                    }
                                }
                            },
                            { $count: 'count' }
                        ]
                    }
                }
            ]);

            logger.info(`User growth report generated for ${startDate} to ${endDate}`);

            return {
                period: { startDate, endDate },
                dailyGrowth: cumulativeData,
                statistics: userStats[0] || {},
                filtersApplied: filters
            };
        } catch (error) {
            logger.error(`Generate user growth report error: ${error.message}`);
            throw error;
        }
    }

    // Generate commission report
    static async generateCommissionReport(startDate, endDate, filters = {}) {
        try {
            const { affiliateId, status, level } = filters;
            
            const matchStage = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            if (affiliateId) matchStage.affiliate = affiliateId;
            if (status) matchStage.status = status;
            if (level) matchStage.level = level;

            const commissionData = await AffiliateCommission.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'affiliate',
                        foreignField: '_id',
                        as: 'affiliateDetails'
                    }
                },
                { $unwind: '$affiliateDetails' },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'referredUser',
                        foreignField: '_id',
                        as: 'referredUserDetails'
                    }
                },
                { $unwind: '$referredUserDetails' },
                {
                    $lookup: {
                        from: 'courses',
                        localField: 'course',
                        foreignField: '_id',
                        as: 'courseDetails'
                    }
                },
                { $unwind: '$courseDetails' },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            affiliateId: '$affiliate',
                            affiliateName: '$affiliateDetails.name',
                            status: '$status',
                            level: '$level'
                        },
                        totalCommission: { $sum: '$commissionAmount' },
                        totalOrders: { $sum: 1 },
                        avgCommission: { $avg: '$commissionAmount' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        affiliateId: '$_id.affiliateId',
                        affiliateName: '$_id.affiliateName',
                        status: '$_id.status',
                        level: '$_id.level',
                        totalCommission: 1,
                        totalOrders: 1,
                        avgCommission: { $round: ['$avgCommission', 2] }
                    }
                },
                { $sort: { date: 1 } }
            ]);

            // Calculate summary
            const summary = {
                totalCommission: commissionData.reduce((sum, item) => sum + item.totalCommission, 0),
                totalOrders: commissionData.reduce((sum, item) => sum + item.totalOrders, 0),
                avgCommission: commissionData.length > 0 ? 
                    commissionData.reduce((sum, item) => sum + item.totalCommission, 0) / 
                    commissionData.reduce((sum, item) => sum + item.totalOrders, 0) : 0,
                byStatus: {},
                byLevel: {},
                topAffiliates: []
            };

            // Group by status
            commissionData.forEach(item => {
                if (!summary.byStatus[item.status]) {
                    summary.byStatus[item.status] = {
                        totalCommission: 0,
                        totalOrders: 0
                    };
                }
                summary.byStatus[item.status].totalCommission += item.totalCommission;
                summary.byStatus[item.status].totalOrders += item.totalOrders;
            });

            // Group by level
            commissionData.forEach(item => {
                if (!summary.byLevel[item.level]) {
                    summary.byLevel[item.level] = {
                        totalCommission: 0,
                        totalOrders: 0
                    };
                }
                summary.byLevel[item.level].totalCommission += item.totalCommission;
                summary.byLevel[item.level].totalOrders += item.totalOrders;
            });

            // Group by affiliate for top affiliates
            const affiliateCommissions = commissionData.reduce((acc, item) => {
                if (!acc[item.affiliateId]) {
                    acc[item.affiliateId] = {
                        affiliateId: item.affiliateId,
                        affiliateName: item.affiliateName,
                        totalCommission: 0,
                        totalOrders: 0
                    };
                }
                acc[item.affiliateId].totalCommission += item.totalCommission;
                acc[item.affiliateId].totalOrders += item.totalOrders;
                return acc;
            }, {});

            summary.topAffiliates = Object.values(affiliateCommissions)
                .sort((a, b) => b.totalCommission - a.totalCommission)
                .slice(0, 10);

            logger.info(`Commission report generated for ${startDate} to ${endDate}`);

            return {
                period: { startDate, endDate },
                summary,
                dailyData: commissionData,
                filtersApplied: filters
            };
        } catch (error) {
            logger.error(`Generate commission report error: ${error.message}`);
            throw error;
        }
    }

    // Generate withdrawal report
    static async generateWithdrawalReport(startDate, endDate, filters = {}) {
        try {
            const { userId, status, paymentMethod } = filters;
            
            const matchStage = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            if (userId) matchStage.user = userId;
            if (status) matchStage.status = status;
            if (paymentMethod) matchStage.paymentMethod = paymentMethod;

            const withdrawalData = await WithdrawRequest.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                { $unwind: '$userDetails' },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            userId: '$user',
                            userName: '$userDetails.name',
                            status: '$status',
                            paymentMethod: '$paymentMethod'
                        },
                        totalAmount: { $sum: '$amount' },
                        totalRequests: { $sum: 1 },
                        avgAmount: { $avg: '$amount' },
                        processingFees: { $sum: '$processingFee' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id.date',
                        userId: '$_id.userId',
                        userName: '$_id.userName',
                        status: '$_id.status',
                        paymentMethod: '$_id.paymentMethod',
                        totalAmount: 1,
                        totalRequests: 1,
                        avgAmount: { $round: ['$avgAmount', 2] },
                        processingFees: 1,
                        netAmount: { $subtract: ['$totalAmount', '$processingFees'] }
                    }
                },
                { $sort: { date: 1 } }
            ]);

            // Calculate summary
            const summary = {
                totalWithdrawals: withdrawalData.reduce((sum, item) => sum + item.totalAmount, 0),
                totalRequests: withdrawalData.reduce((sum, item) => sum + item.totalRequests, 0),
                totalFees: withdrawalData.reduce((sum, item) => sum + item.processingFees, 0),
                netWithdrawals: withdrawalData.reduce((sum, item) => sum + item.netAmount, 0),
                byStatus: {},
                byPaymentMethod: {},
                topUsers: []
            };

            // Group by status
            withdrawalData.forEach(item => {
                if (!summary.byStatus[item.status]) {
                    summary.byStatus[item.status] = {
                        totalAmount: 0,
                        totalRequests: 0
                    };
                }
                summary.byStatus[item.status].totalAmount += item.totalAmount;
                summary.byStatus[item.status].totalRequests += item.totalRequests;
            });

            // Group by payment method
            withdrawalData.forEach(item => {
                if (!summary.byPaymentMethod[item.paymentMethod]) {
                    summary.byPaymentMethod[item.paymentMethod] = {
                        totalAmount: 0,
                        totalRequests: 0
                    };
                }
                summary.byPaymentMethod[item.paymentMethod].totalAmount += item.totalAmount;
                summary.byPaymentMethod[item.paymentMethod].totalRequests += item.totalRequests;
            });

            // Group by user for top users
            const userWithdrawals = withdrawalData.reduce((acc, item) => {
                if (!acc[item.userId]) {
                    acc[item.userId] = {
                        userId: item.userId,
                        userName: item.userName,
                        totalAmount: 0,
                        totalRequests: 0
                    };
                }
                acc[item.userId].totalAmount += item.totalAmount;
                acc[item.userId].totalRequests += item.totalRequests;
                return acc;
            }, {});

            summary.topUsers = Object.values(userWithdrawals)
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 10);

            logger.info(`Withdrawal report generated for ${startDate} to ${endDate}`);

            return {
                period: { startDate, endDate },
                summary,
                dailyData: withdrawalData,
                filtersApplied: filters
            };
        } catch (error) {
            logger.error(`Generate withdrawal report error: ${error.message}`);
            throw error;
        }
    }

    // Generate course performance report
    static async generateCoursePerformanceReport(startDate, endDate, filters = {}) {
        try {
            const { instructorId, category, level, isPublished } = filters;
            
            // Get course data with enrollments
            const courseMatchStage = {};
            if (instructorId) courseMatchStage.instructor = instructorId;
            if (category) courseMatchStage.category = category;
            if (level) courseMatchStage.level = level;
            if (isPublished !== undefined) courseMatchStage.isPublished = isPublished;

            const courses = await Course.find(courseMatchStage)
                .populate('instructor', 'name email')
                .lean();

            // Get enrollment data for period
            const enrollmentMatchStage = {
                paymentStatus: 'completed',
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            if (instructorId) {
                const instructorCourses = courses.filter(c => 
                    c.instructor._id.toString() === instructorId
                ).map(c => c._id);
                enrollmentMatchStage.course = { $in: instructorCourses };
            }

            const enrollments = await Order.aggregate([
                { $match: enrollmentMatchStage },
                {
                    $group: {
                        _id: '$course',
                        totalEnrollments: { $sum: 1 },
                        totalRevenue: { $sum: '$finalAmount' },
                        avgRating: { $avg: '$rating' }
                    }
                }
            ]);

            // Get review data
            const reviews = await Order.aggregate([
                { $match: enrollmentMatchStage },
                {
                    $match: { rating: { $exists: true, $ne: null } }
                },
                {
                    $group: {
                        _id: '$course',
                        totalReviews: { $sum: 1 },
                        avgRating: { $avg: '$rating' }
                    }
                }
            ]);

            // Combine data
            const coursePerformance = courses.map(course => {
                const enrollment = enrollments.find(e => e._id.toString() === course._id.toString());
                const review = reviews.find(r => r._id.toString() === course._id.toString());
                
                return {
                    courseId: course._id,
                    title: course.title,
                    category: course.category,
                    level: course.level,
                    price: course.price,
                    discountedPrice: course.discountedPrice,
                    finalPrice: course.discountedPrice > 0 ? course.discountedPrice : course.price,
                    instructor: course.instructor,
                    totalEnrollments: enrollment?.totalEnrollments || 0,
                    totalRevenue: enrollment?.totalRevenue || 0,
                    totalReviews: review?.totalReviews || 0,
                    avgRating: review?.avgRating || 0,
                    isPublished: course.isPublished,
                    createdAt: course.createdAt,
                    conversionRate: course.price > 0 ? 
                        ((enrollment?.totalRevenue || 0) / course.price) : 0
                };
            });

            // Calculate summary
            const summary = {
                totalCourses: coursePerformance.length,
                totalEnrollments: coursePerformance.reduce((sum, c) => sum + c.totalEnrollments, 0),
                totalRevenue: coursePerformance.reduce((sum, c) => sum + c.totalRevenue, 0),
                avgRating: coursePerformance.filter(c => c.avgRating > 0).length > 0 ?
                    coursePerformance.filter(c => c.avgRating > 0)
                        .reduce((sum, c) => sum + c.avgRating, 0) / 
                    coursePerformance.filter(c => c.avgRating > 0).length : 0,
                byCategory: {},
                byLevel: {},
                topPerforming: [],
                lowPerforming: []
            };

            // Group by category
            coursePerformance.forEach(course => {
                if (!summary.byCategory[course.category]) {
                    summary.byCategory[course.category] = {
                        totalCourses: 0,
                        totalEnrollments: 0,
                        totalRevenue: 0
                    };
                }
                summary.byCategory[course.category].totalCourses++;
                summary.byCategory[course.category].totalEnrollments += course.totalEnrollments;
                summary.byCategory[course.category].totalRevenue += course.totalRevenue;
            });

            // Group by level
            coursePerformance.forEach(course => {
                if (!summary.byLevel[course.level]) {
                    summary.byLevel[course.level] = {
                        totalCourses: 0,
                        totalEnrollments: 0,
                        totalRevenue: 0
                    };
                }
                summary.byLevel[course.level].totalCourses++;
                summary.byLevel[course.level].totalEnrollments += course.totalEnrollments;
                summary.byLevel[course.level].totalRevenue += course.totalRevenue;
            });

            // Top performing courses
            summary.topPerforming = [...coursePerformance]
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, 10);

            // Low performing courses (with enrollments but low revenue)
            summary.lowPerforming = [...coursePerformance]
                .filter(c => c.totalEnrollments > 0 && c.totalRevenue < 1000)
                .sort((a, b) => a.totalRevenue - b.totalRevenue)
                .slice(0, 10);

            logger.info(`Course performance report generated for ${startDate} to ${endDate}`);

            return {
                period: { startDate, endDate },
                summary,
                coursePerformance,
                filtersApplied: filters
            };
        } catch (error) {
            logger.error(`Generate course performance report error: ${error.message}`);
            throw error;
        }
    }

    // Generate financial summary report
    static async generateFinancialSummaryReport(startDate, endDate) {
        try {
            // Get all financial data
            const [sales, commissions, withdrawals, walletTransactions] = await Promise.all([
                // Sales data
                Order.aggregate([
                    {
                        $match: {
                            paymentStatus: 'completed',
                            createdAt: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$finalAmount' },
                            totalOrders: { $sum: 1 },
                            avgOrderValue: { $avg: '$finalAmount' },
                            byPaymentMethod: {
                                $push: {
                                    method: '$paymentMethod',
                                    amount: '$finalAmount'
                                }
                            }
                        }
                    }
                ]),

                // Commission data
                AffiliateCommission.aggregate([
                    {
                        $match: {
                            status: { $in: ['paid', 'approved'] },
                            createdAt: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalCommissions: { $sum: '$commissionAmount' },
                            totalPaid: {
                                $sum: {
                                    $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0]
                                }
                            },
                            totalApproved: {
                                $sum: {
                                    $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0]
                                }
                            }
                        }
                    }
                ]),

                // Withdrawal data
                WithdrawRequest.aggregate([
                    {
                        $match: {
                            status: { $in: ['completed', 'processing'] },
                            createdAt: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalWithdrawals: { $sum: '$amount' },
                            totalFees: { $sum: '$processingFee' },
                            netWithdrawals: { $sum: { $subtract: ['$amount', '$processingFee'] } },
                            byStatus: {
                                $push: {
                                    status: '$status',
                                    amount: '$amount'
                                }
                            }
                        }
                    }
                ]),

                // Wallet transaction data
                Transaction.aggregate([
                    {
                        $match: {
                            status: 'completed',
                            createdAt: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
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
                            netFlow: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$type', 'credit'] }, 
                                        '$amount', 
                                        { $multiply: ['$amount', -1] }
                                    ]
                                }
                            }
                        }
                    }
                ])
            ]);

            // Process payment method breakdown
            const paymentMethodBreakdown = {};
            if (sales[0]?.byPaymentMethod) {
                sales[0].byPaymentMethod.forEach(item => {
                    if (!paymentMethodBreakdown[item.method]) {
                        paymentMethodBreakdown[item.method] = 0;
                    }
                    paymentMethodBreakdown[item.method] += item.amount;
                });
            }

            // Process withdrawal status breakdown
            const withdrawalStatusBreakdown = {};
            if (withdrawals[0]?.byStatus) {
                withdrawals[0].byStatus.forEach(item => {
                    if (!withdrawalStatusBreakdown[item.status]) {
                        withdrawalStatusBreakdown[item.status] = 0;
                    }
                    withdrawalStatusBreakdown[item.status] += item.amount;
                });
            }

            // Calculate platform earnings
            const platformEarnings = (sales[0]?.totalRevenue || 0) - 
                                    (commissions[0]?.totalCommissions || 0);

            // Calculate net profit (platform earnings - operational costs)
            const operationalCosts = (withdrawals[0]?.totalFees || 0); // Add other costs as needed
            const netProfit = platformEarnings - operationalCosts;

            const financialSummary = {
                period: { startDate, endDate },
                revenue: {
                    total: sales[0]?.totalRevenue || 0,
                    totalOrders: sales[0]?.totalOrders || 0,
                    avgOrderValue: sales[0]?.avgOrderValue || 0,
                    byPaymentMethod: paymentMethodBreakdown
                },
                commissions: {
                    total: commissions[0]?.totalCommissions || 0,
                    paid: commissions[0]?.totalPaid || 0,
                    approved: commissions[0]?.totalApproved || 0,
                    pending: (commissions[0]?.totalCommissions || 0) - 
                            (commissions[0]?.totalPaid || 0)
                },
                withdrawals: {
                    total: withdrawals[0]?.totalWithdrawals || 0,
                    fees: withdrawals[0]?.totalFees || 0,
                    net: withdrawals[0]?.netWithdrawals || 0,
                    byStatus: withdrawalStatusBreakdown
                },
                walletActivity: {
                    totalCredits: walletTransactions[0]?.totalCredits || 0,
                    totalDebits: walletTransactions[0]?.totalDebits || 0,
                    netFlow: walletTransactions[0]?.netFlow || 0
                },
                earnings: {
                    platformEarnings: platformEarnings,
                    operationalCosts: operationalCosts,
                    netProfit: netProfit,
                    profitMargin: sales[0]?.totalRevenue ? 
                        (netProfit / sales[0].totalRevenue) * 100 : 0
                },
                keyMetrics: {
                    customerAcquisitionCost: 0, // Would need marketing cost data
                    lifetimeValue: sales[0]?.totalRevenue && sales[0]?.totalOrders ?
                        sales[0].totalRevenue / sales[0].totalOrders : 0,
                    commissionPayoutRatio: sales[0]?.totalRevenue ?
                        (commissions[0]?.totalCommissions || 0) / sales[0].totalRevenue * 100 : 0,
                    withdrawalToRevenueRatio: sales[0]?.totalRevenue ?
                        (withdrawals[0]?.totalWithdrawals || 0) / sales[0].totalRevenue * 100 : 0
                }
            };

            logger.info(`Financial summary report generated for ${startDate} to ${endDate}`);

            return financialSummary;
        } catch (error) {
            logger.error(`Generate financial summary report error: ${error.message}`);
            throw error;
        }
    }

    // Export report to different formats
    static async exportReport(reportData, format = 'json', reportType = 'sales') {
        try {
            let exportData;
            let filename = `${reportType}_report_${Date.now()}`;

            switch (format.toLowerCase()) {
                case 'csv':
                    exportData = this.convertToCSV(reportData, reportType);
                    filename += '.csv';
                    break;

                case 'excel':
                    exportData = this.convertToExcel(reportData, reportType);
                    filename += '.xlsx';
                    break;

                case 'pdf':
                    exportData = this.convertToPDF(reportData, reportType);
                    filename += '.pdf';
                    break;

                case 'json':
                default:
                    exportData = JSON.stringify(reportData, null, 2);
                    filename += '.json';
            }

            logger.info(`Report exported: ${reportType} in ${format} format`);

            return {
                filename,
                format,
                data: exportData,
                size: exportData.length,
                reportType,
                exportedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(`Export report error: ${error.message}`);
            throw error;
        }
    }

    // Convert report data to CSV
    static convertToCSV(reportData, reportType) {
        try {
            let csvContent = '';
            
            switch (reportType) {
                case 'sales':
                    csvContent = this.convertSalesToCSV(reportData);
                    break;
                case 'users':
                    csvContent = this.convertUsersToCSV(reportData);
                    break;
                case 'commissions':
                    csvContent = this.convertCommissionsToCSV(reportData);
                    break;
                case 'withdrawals':
                    csvContent = this.convertWithdrawalsToCSV(reportData);
                    break;
                default:
                    csvContent = this.convertGenericToCSV(reportData);
            }

            return csvContent;
        } catch (error) {
            logger.error(`Convert to CSV error: ${error.message}`);
            throw error;
        }
    }

    // Helper methods for CSV conversion (simplified versions)
    static convertSalesToCSV(reportData) {
        const headers = ['Date', 'Course', 'Instructor', 'Sales', 'Orders', 'Avg Order'];
        let csv = headers.join(',') + '\n';
        
        if (reportData.dailyData) {
            reportData.dailyData.forEach(row => {
                csv += [
                    row.date,
                    `"${row.courseTitle}"`,
                    `"${row.instructorName}"`,
                    row.totalSales,
                    row.totalOrders,
                    row.avgOrderValue
                ].join(',') + '\n';
            });
        }
        
        return csv;
    }

    static convertUsersToCSV(reportData) {
        const headers = ['Date', 'Total', 'Students', 'Instructors', 'Affiliates'];
        let csv = headers.join(',') + '\n';
        
        if (reportData.dailyGrowth) {
            reportData.dailyGrowth.forEach(row => {
                const byRole = {};
                row.byRole?.forEach(role => {
                    byRole[role.role] = role.count;
                });
                
                csv += [
                    row.date,
                    row.daily,
                    byRole.student || 0,
                    byRole.instructor || 0,
                    byRole.affiliate || 0
                ].join(',') + '\n';
            });
        }
        
        return csv;
    }

    static convertCommissionsToCSV(reportData) {
        const headers = ['Date', 'Affiliate', 'Status', 'Level', 'Commission', 'Orders', 'Avg Commission'];
        let csv = headers.join(',') + '\n';
        
        if (reportData.dailyData) {
            reportData.dailyData.forEach(row => {
                csv += [
                    row.date,
                    `"${row.affiliateName}"`,
                    row.status,
                    row.level,
                    row.totalCommission,
                    row.totalOrders,
                    row.avgCommission
                ].join(',') + '\n';
            });
        }
        
        return csv;
    }

    static convertWithdrawalsToCSV(reportData) {
        const headers = ['Date', 'User', 'Status', 'Method', 'Amount', 'Requests', 'Fees', 'Net'];
        let csv = headers.join(',') + '\n';
        
        if (reportData.dailyData) {
            reportData.dailyData.forEach(row => {
                csv += [
                    row.date,
                    `"${row.userName}"`,
                    row.status,
                    row.paymentMethod,
                    row.totalAmount,
                    row.totalRequests,
                    row.processingFees,
                    row.netAmount
                ].join(',') + '\n';
            });
        }
        
        return csv;
    }

    static convertGenericToCSV(data) {
        // Generic CSV conversion for any data
        if (Array.isArray(data)) {
            if (data.length === 0) return '';
            
            const headers = Object.keys(data[0]);
            let csv = headers.join(',') + '\n';
            
            data.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value;
                });
                csv += values.join(',') + '\n';
            });
            
            return csv;
        }
        
        return JSON.stringify(data);
    }

    // Convert to Excel (placeholder - would use a library like exceljs in real implementation)
    static convertToExcel(reportData, reportType) {
        // In real implementation, use exceljs or similar library
        // For now, return CSV as placeholder
        return this.convertToCSV(reportData, reportType);
    }

    // Convert to PDF (placeholder - would use a library like pdfkit in real implementation)
    static convertToPDF(reportData, reportType) {
        // In real implementation, use pdfkit or similar library
        // For now, return JSON as placeholder
        return JSON.stringify(reportData, null, 2);
    }

    // Get report templates
    static async getReportTemplates() {
        try {
            const templates = {
                sales: {
                    name: 'Sales Report',
                    description: 'Detailed sales and revenue report',
                    availableFormats: ['csv', 'excel', 'pdf', 'json'],
                    defaultFilters: {
                        dateRange: 'last_30_days',
                        groupBy: 'daily'
                    }
                },
                users: {
                    name: 'User Growth Report',
                    description: 'User registration and growth analysis',
                    availableFormats: ['csv', 'excel', 'pdf', 'json'],
                    defaultFilters: {
                        dateRange: 'last_90_days',
                        groupBy: 'daily'
                    }
                },
                commissions: {
                    name: 'Commission Report',
                    description: 'Affiliate commission tracking and analysis',
                    availableFormats: ['csv', 'excel', 'pdf', 'json'],
                    defaultFilters: {
                        dateRange: 'last_30_days',
                        groupBy: 'daily'
                    }
                },
                withdrawals: {
                    name: 'Withdrawal Report',
                    description: 'Withdrawal requests and processing',
                    availableFormats: ['csv', 'excel', 'pdf', 'json'],
                    defaultFilters: {
                        dateRange: 'last_30_days',
                        groupBy: 'daily'
                    }
                },
                courses: {
                    name: 'Course Performance Report',
                    description: 'Course enrollment and performance metrics',
                    availableFormats: ['csv', 'excel', 'pdf', 'json'],
                    defaultFilters: {
                        dateRange: 'last_90_days',
                        groupBy: 'course'
                    }
                },
                financial: {
                    name: 'Financial Summary Report',
                    description: 'Comprehensive financial overview',
                    availableFormats: ['csv', 'excel', 'pdf', 'json'],
                    defaultFilters: {
                        dateRange: 'last_30_days',
                        groupBy: 'summary'
                    }
                }
            };

            return templates;
        } catch (error) {
            logger.error(`Get report templates error: ${error.message}`);
            throw error;
        }
    }

    // Schedule automated reports
    static async scheduleReport(scheduleConfig) {
        try {
            const { reportType, frequency, recipients, format, filters } = scheduleConfig;
            
            // In real implementation, you would:
            // 1. Save schedule to database
            // 2. Set up cron job or similar scheduler
            // 3. Generate and send report at scheduled times
            
            const scheduleId = `SCH${Date.now()}${Math.floor(Math.random() * 1000)}`;
            
            logger.info(`Report scheduled: ${reportType} with frequency ${frequency}`);

            return {
                success: true,
                message: 'Report scheduled successfully',
                scheduleId,
                nextRun: this.calculateNextRun(frequency),
                config: scheduleConfig
            };
        } catch (error) {
            logger.error(`Schedule report error: ${error.message}`);
            throw error;
        }
    }

    // Calculate next run time based on frequency
    static calculateNextRun(frequency) {
        const now = new Date();
        
        switch (frequency) {
            case 'daily':
                now.setDate(now.getDate() + 1);
                now.setHours(9, 0, 0, 0); // 9 AM next day
                break;
            case 'weekly':
                now.setDate(now.getDate() + 7);
                now.setHours(9, 0, 0, 0); // 9 AM next week
                break;
            case 'monthly':
                now.setMonth(now.getMonth() + 1);
                now.setDate(1);
                now.setHours(9, 0, 0, 0); // 9 AM first day of next month
                break;
            default:
                now.setDate(now.getDate() + 1);
                now.setHours(9, 0, 0, 0);
        }
        
        return now;
    }
}

module.exports = ReportService;