const COMMISSION_STATUS = {
    // Commission types
    TYPES: {
        DIRECT_REFERRAL: 'direct_referral',
        INDIRECT_REFERRAL: 'indirect_referral',
        COURSE_PURCHASE: 'course_purchase',
        SUBSCRIPTION: 'subscription',
        RENEWAL: 'renewal',
        UPSELL: 'upsell',
        BONUS: 'bonus',
        PROMOTIONAL: 'promotional',
        OTHER: 'other'
    },

    // Commission levels (for multi-level marketing)
    LEVELS: {
        LEVEL_1: 1, // Direct referral
        LEVEL_2: 2, // Referral of referral
        LEVEL_3: 3  // Third level
    },

    // Commission statuses
    STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        PAID: 'paid',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired',
        HOLD: 'hold',
        UNDER_REVIEW: 'under_review'
    },

    // Payout methods
    PAYOUT_METHODS: {
        WALLET: 'wallet',
        BANK_TRANSFER: 'bank_transfer',
        UPI: 'upi',
        PAYPAL: 'paypal',
        CASH: 'cash',
        CHEQUE: 'cheque'
    },

    // Default commission rates (percentage)
    DEFAULT_RATES: {
        DIRECT_REFERRAL: 10, // 10%
        INDIRECT_REFERRAL: 5, // 5%
        LEVEL_2: 5,  // 5% for level 2
        LEVEL_3: 2   // 2% for level 3
    },

    // Commission tiers based on performance
    TIERS: {
        BRONZE: {
            name: 'Bronze',
            minReferrals: 0,
            maxReferrals: 10,
            commissionRate: 10, // 10%
            bonusRate: 0,
            requirements: '0-10 referrals'
        },
        SILVER: {
            name: 'Silver',
            minReferrals: 11,
            maxReferrals: 50,
            commissionRate: 12, // 12%
            bonusRate: 2, // 2% bonus
            requirements: '11-50 referrals'
        },
        GOLD: {
            name: 'Gold',
            minReferrals: 51,
            maxReferrals: 200,
            commissionRate: 15, // 15%
            bonusRate: 5, // 5% bonus
            requirements: '51-200 referrals'
        },
        PLATINUM: {
            name: 'Platinum',
            minReferrals: 201,
            maxReferrals: 1000,
            commissionRate: 18, // 18%
            bonusRate: 8, // 8% bonus
            requirements: '201-1000 referrals'
        },
        DIAMOND: {
            name: 'Diamond',
            minReferrals: 1001,
            maxReferrals: null, // No upper limit
            commissionRate: 20, // 20%
            bonusRate: 10, // 10% bonus
            requirements: '1000+ referrals'
        }
    },

    // Commission calculation methods
    CALCULATION_METHODS: {
        PERCENTAGE: 'percentage',
        FIXED: 'fixed',
        TIERED: 'tiered',
        HYBRID: 'hybrid'
    },

    // Minimum and maximum commission limits
    LIMITS: {
        MIN_COMMISSION_AMOUNT: 1, // ₹1 minimum
        MAX_COMMISSION_AMOUNT: 100000, // ₹100,000 maximum
        MIN_COMMISSION_PERCENTAGE: 0, // 0% minimum
        MAX_COMMISSION_PERCENTAGE: 50, // 50% maximum
        MIN_PAYOUT_AMOUNT: 100, // ₹100 minimum for payout
        MAX_MONTHLY_COMMISSION: 500000 // ₹500,000 maximum per month
    },

    // Commission hold periods (in days)
    HOLD_PERIODS: {
        STANDARD: 7, // 7 days hold for standard commissions
        NEW_AFFILIATE: 14, // 14 days hold for new affiliates
        HIGH_VALUE: 30, // 30 days hold for high-value commissions
        DISPUTED: 45 // 45 days hold for disputed commissions
    },

    // Commission expiration (in days)
    EXPIRATION: {
        PENDING_APPROVAL: 30, // 30 days to approve
        APPROVED_UNPAID: 90, // 90 days to pay
        BONUS_COMMISSIONS: 180 // 180 days for bonus commissions
    },

    // Status descriptions
    DESCRIPTIONS: {
        'pending': 'Commission is pending approval',
        'approved': 'Commission has been approved for payment',
        'paid': 'Commission has been paid out',
        'rejected': 'Commission was rejected',
        'cancelled': 'Commission was cancelled',
        'expired': 'Commission claim expired',
        'hold': 'Commission is on hold',
        'under_review': 'Commission is under review'
    },

    // Status colors
    COLORS: {
        'pending': '#F59E0B', // amber
        'approved': '#10B981', // green
        'paid': '#10B981', // green
        'rejected': '#EF4444', // red
        'cancelled': '#6B7280', // gray
        'expired': '#374151', // dark gray
        'hold': '#8B5CF6', // purple
        'under_review': '#3B82F6' // blue
    },

    // Status icons
    ICONS: {
        'pending': '⏳',
        'approved': '✅',
        'paid': '💰',
        'rejected': '❌',
        'cancelled': '🚫',
        'expired': '⌛',
        'hold': '⏸️',
        'under_review': '🔍'
    },

    // Allowed status transitions
    TRANSITIONS: {
        'pending': ['approved', 'rejected', 'cancelled', 'hold', 'under_review', 'expired'],
        'approved': ['paid', 'rejected', 'cancelled', 'hold'],
        'paid': [],
        'rejected': [],
        'cancelled': [],
        'expired': [],
        'hold': ['approved', 'rejected', 'cancelled'],
        'under_review': ['approved', 'rejected', 'cancelled', 'hold']
    },

    // Commission validation functions
    isValidType: (type) => {
        return Object.values(COMMISSION_STATUS.TYPES).includes(type);
    },

    isValidStatus: (status) => {
        return Object.values(COMMISSION_STATUS.STATUS).includes(status);
    },

    isValidLevel: (level) => {
        return Object.values(COMMISSION_STATUS.LEVELS).includes(level);
    },

    isValidPayoutMethod: (method) => {
        return Object.values(COMMISSION_STATUS.PAYOUT_METHODS).includes(method);
    },

    canTransition: (fromStatus, toStatus) => {
        return COMMISSION_STATUS.TRANSITIONS[fromStatus]?.includes(toStatus) || false;
    },

    getStatusDescription: (status) => {
        return COMMISSION_STATUS.DESCRIPTIONS[status] || 'Unknown status';
    },

    getStatusColor: (status) => {
        return COMMISSION_STATUS.COLORS[status] || '#6B7280';
    },

    getStatusIcon: (status) => {
        return COMMISSION_STATUS.ICONS[status] || '❓';
    },

    // Commission calculation functions
    calculateCommission: (amount, percentage, calculationMethod = 'percentage') => {
        if (calculationMethod === 'percentage') {
            const commission = (amount * percentage) / 100;
            return Math.max(commission, COMMISSION_STATUS.LIMITS.MIN_COMMISSION_AMOUNT);
        } else if (calculationMethod === 'fixed') {
            return percentage; // percentage is actually fixed amount in this case
        }
        return 0;
    },

    calculateTieredCommission: (amount, tier) => {
        const tierInfo = COMMISSION_STATUS.TIERS[tier.toUpperCase()];
        if (!tierInfo) {
            return COMMISSION_STATUS.calculateCommission(amount, COMMISSION_STATUS.DEFAULT_RATES.DIRECT_REFERRAL);
        }
        
        const baseCommission = (amount * tierInfo.commissionRate) / 100;
        const bonus = (amount * tierInfo.bonusRate) / 100;
        
        return baseCommission + bonus;
    },

    // Tier determination functions
    getTierByReferralCount: (referralCount) => {
        const tiers = Object.values(COMMISSION_STATUS.TIERS);
        
        for (const tier of tiers) {
            if (referralCount >= tier.minReferrals && 
                (tier.maxReferrals === null || referralCount <= tier.maxReferrals)) {
                return tier;
            }
        }
        
        return COMMISSION_STATUS.TIERS.BRONZE;
    },

    getTierByName: (tierName) => {
        return COMMISSION_STATUS.TIERS[tierName.toUpperCase()] || COMMISSION_STATUS.TIERS.BRONZE;
    },

    // Multi-level commission calculation
    calculateMultiLevelCommission: (orderAmount, levels = {1: 10, 2: 5, 3: 2}) => {
        const commissions = {};
        
        for (const [level, percentage] of Object.entries(levels)) {
            if (percentage > 0) {
                commissions[level] = (orderAmount * percentage) / 100;
            }
        }
        
        return commissions;
    },

    // Payout eligibility check
    isEligibleForPayout: (commission) => {
        if (!commission) return false;
        
        const { status, amount, createdAt } = commission;
        const currentDate = new Date();
        const commissionDate = new Date(createdAt);
        const daysDifference = (currentDate - commissionDate) / (1000 * 60 * 60 * 24);
        
        // Check minimum amount
        if (amount < COMMISSION_STATUS.LIMITS.MIN_PAYOUT_AMOUNT) {
            return false;
        }
        
        // Check status
        if (status !== 'approved') {
            return false;
        }
        
        // Check hold period
        const holdPeriod = COMMISSION_STATUS.HOLD_PERIODS.STANDARD;
        if (daysDifference < holdPeriod) {
            return false;
        }
        
        return true;
    },

    // Commission expiration check
    isExpired: (commission) => {
        if (!commission) return true;
        
        const { status, createdAt } = commission;
        const currentDate = new Date();
        const commissionDate = new Date(createdAt);
        const daysDifference = (currentDate - commissionDate) / (1000 * 60 * 60 * 24);
        
        if (status === 'pending' && daysDifference > COMMISSION_STATUS.EXPIRATION.PENDING_APPROVAL) {
            return true;
        }
        
        if (status === 'approved' && daysDifference > COMMISSION_STATUS.EXPIRATION.APPROVED_UNPAID) {
            return true;
        }
        
        return false;
    },

    // Commission statistics
    calculateStats: (commissions) => {
        const stats = {
            total: 0,
            pending: 0,
            approved: 0,
            paid: 0,
            rejected: 0,
            cancelled: 0,
            expired: 0,
            hold: 0,
            underReview: 0,
            totalAmount: 0,
            pendingAmount: 0,
            approvedAmount: 0,
            paidAmount: 0
        };
        
        commissions.forEach(commission => {
            stats.total++;
            stats.totalAmount += commission.amount || 0;
            
            switch (commission.status) {
                case 'pending':
                    stats.pending++;
                    stats.pendingAmount += commission.amount || 0;
                    break;
                case 'approved':
                    stats.approved++;
                    stats.approvedAmount += commission.amount || 0;
                    break;
                case 'paid':
                    stats.paid++;
                    stats.paidAmount += commission.amount || 0;
                    break;
                case 'rejected':
                    stats.rejected++;
                    break;
                case 'cancelled':
                    stats.cancelled++;
                    break;
                case 'expired':
                    stats.expired++;
                    break;
                case 'hold':
                    stats.hold++;
                    break;
                case 'under_review':
                    stats.underReview++;
                    break;
            }
        });
        
        return stats;
    },

    // Commission report generation
    generateReport: (commissions, timeframe = 'monthly') => {
        const report = {
            timeframe,
            totalCommissions: commissions.length,
            totalAmount: 0,
            averageCommission: 0,
            highestCommission: 0,
            lowestCommission: Infinity,
            byStatus: {},
            byType: {},
            byLevel: {},
            dailyBreakdown: {},
            monthlyBreakdown: {}
        };
        
        commissions.forEach(commission => {
            const amount = commission.amount || 0;
            report.totalAmount += amount;
            
            // Update highest/lowest
            if (amount > report.highestCommission) {
                report.highestCommission = amount;
            }
            if (amount < report.lowestCommission) {
                report.lowestCommission = amount;
            }
            
            // Group by status
            report.byStatus[commission.status] = (report.byStatus[commission.status] || 0) + 1;
            
            // Group by type
            report.byType[commission.type] = (report.byType[commission.type] || 0) + 1;
            
            // Group by level
            if (commission.level) {
                report.byLevel[commission.level] = (report.byLevel[commission.level] || 0) + 1;
            }
            
            // Daily breakdown
            const date = new Date(commission.createdAt).toISOString().split('T')[0];
            report.dailyBreakdown[date] = (report.dailyBreakdown[date] || 0) + amount;
            
            // Monthly breakdown
            const month = new Date(commission.createdAt).toISOString().substring(0, 7);
            report.monthlyBreakdown[month] = (report.monthlyBreakdown[month] || 0) + amount;
        });
        
        // Calculate average
        report.averageCommission = commissions.length > 0 ? report.totalAmount / commissions.length : 0;
        
        // If no commissions, set lowest to 0
        if (report.lowestCommission === Infinity) {
            report.lowestCommission = 0;
        }
        
        return report;
    },

    // Affiliate performance metrics
    calculatePerformance: (affiliateData) => {
        const { commissions, referrals, conversions } = affiliateData;
        
        const stats = {
            totalCommissions: commissions.length,
            totalEarned: commissions.reduce((sum, c) => sum + (c.amount || 0), 0),
            totalReferrals: referrals.length,
            totalConversions: conversions.length,
            conversionRate: referrals.length > 0 ? (conversions.length / referrals.length) * 100 : 0,
            averageCommission: commissions.length > 0 ? 
                commissions.reduce((sum, c) => sum + (c.amount || 0), 0) / commissions.length : 0,
            commissionPerConversion: conversions.length > 0 ?
                commissions.reduce((sum, c) => sum + (c.amount || 0), 0) / conversions.length : 0
        };
        
        return stats;
    }
};

module.exports = COMMISSION_STATUS;