const PAYMENT_STATUS = {
    // Order payment statuses
    ORDER: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed',
        REFUNDED: 'refunded',
        PARTIALLY_REFUNDED: 'partially_refunded',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired'
    },

    // Razorpay payment statuses
    RAZORPAY: {
        CREATED: 'created',
        AUTHORIZED: 'authorized',
        CAPTURED: 'captured',
        REFUNDED: 'refunded',
        FAILED: 'failed',
        PENDING: 'pending'
    },

    // Wallet transaction statuses
    WALLET: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        FAILED: 'failed',
        CANCELLED: 'cancelled',
        REVERSED: 'reversed'
    },

    // Withdrawal statuses
    WITHDRAWAL: {
        PENDING: 'pending',
        APPROVED: 'approved',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
        FAILED: 'failed'
    },

    // Commission statuses
    COMMISSION: {
        PENDING: 'pending',
        APPROVED: 'approved',
        PAID: 'paid',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired'
    },

    // Refund statuses
    REFUND: {
        PENDING: 'pending',
        APPROVED: 'approved',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        REJECTED: 'rejected',
        FAILED: 'failed'
    },

    // Payment method statuses
    METHOD: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        SUSPENDED: 'suspended',
        VERIFIED: 'verified',
        PENDING_VERIFICATION: 'pending_verification'
    },

    // Status descriptions
    DESCRIPTIONS: {
        // Order status descriptions
        'pending': 'Payment is pending',
        'processing': 'Payment is being processed',
        'completed': 'Payment completed successfully',
        'failed': 'Payment failed',
        'refunded': 'Payment has been refunded',
        'partially_refunded': 'Partial amount has been refunded',
        'cancelled': 'Payment was cancelled',
        'expired': 'Payment link expired',

        // Withdrawal status descriptions
        'withdrawal_pending': 'Withdrawal request is pending approval',
        'withdrawal_approved': 'Withdrawal has been approved',
        'withdrawal_processing': 'Withdrawal is being processed',
        'withdrawal_completed': 'Withdrawal completed successfully',
        'withdrawal_rejected': 'Withdrawal request was rejected',
        'withdrawal_cancelled': 'Withdrawal was cancelled',
        'withdrawal_failed': 'Withdrawal processing failed',

        // Commission status descriptions
        'commission_pending': 'Commission is pending approval',
        'commission_approved': 'Commission has been approved',
        'commission_paid': 'Commission has been paid',
        'commission_rejected': 'Commission was rejected',
        'commission_cancelled': 'Commission was cancelled',
        'commission_expired': 'Commission claim expired'
    },

    // Status colors (for UI)
    COLORS: {
        'pending': '#F59E0B', // amber
        'processing': '#3B82F6', // blue
        'completed': '#10B981', // green
        'failed': '#EF4444', // red
        'refunded': '#8B5CF6', // purple
        'partially_refunded': '#EC4899', // pink
        'cancelled': '#6B7280', // gray
        'expired': '#374151', // dark gray
        'approved': '#10B981', // green
        'rejected': '#EF4444', // red
        'paid': '#10B981', // green
        'active': '#10B981', // green
        'inactive': '#6B7280', // gray
        'suspended': '#F59E0B', // amber
        'verified': '#10B981', // green
        'pending_verification': '#F59E0B' // amber
    },

    // Status icons (for UI)
    ICONS: {
        'pending': '⏳',
        'processing': '🔄',
        'completed': '✅',
        'failed': '❌',
        'refunded': '💸',
        'partially_refunded': '💰',
        'cancelled': '🚫',
        'expired': '⌛',
        'approved': '👍',
        'rejected': '👎',
        'paid': '💳',
        'active': '🟢',
        'inactive': '⚫',
        'suspended': '🟡',
        'verified': '🔒',
        'pending_verification': '🔄'
    },

    // Status flows (allowed transitions)
    FLOWS: {
        ORDER: {
            'pending': ['processing', 'completed', 'failed', 'cancelled', 'expired'],
            'processing': ['completed', 'failed', 'cancelled'],
            'completed': ['refunded', 'partially_refunded'],
            'failed': [],
            'refunded': [],
            'partially_refunded': [],
            'cancelled': [],
            'expired': []
        },

        WITHDRAWAL: {
            'pending': ['approved', 'rejected', 'cancelled'],
            'approved': ['processing', 'rejected'],
            'processing': ['completed', 'failed', 'rejected'],
            'completed': [],
            'rejected': [],
            'cancelled': [],
            'failed': []
        },

        COMMISSION: {
            'pending': ['approved', 'rejected', 'cancelled', 'expired'],
            'approved': ['paid', 'rejected', 'cancelled'],
            'paid': [],
            'rejected': [],
            'cancelled': [],
            'expired': []
        },

        REFUND: {
            'pending': ['approved', 'rejected'],
            'approved': ['processing', 'rejected'],
            'processing': ['completed', 'failed'],
            'completed': [],
            'rejected': [],
            'failed': []
        }
    },

    // Status priorities (for sorting)
    PRIORITIES: {
        'pending': 1,
        'processing': 2,
        'approved': 3,
        'completed': 4,
        'paid': 4,
        'failed': 5,
        'rejected': 5,
        'cancelled': 5,
        'expired': 5,
        'refunded': 6,
        'partially_refunded': 6
    },

    // Auto-processing rules
    AUTO_PROCESSING: {
        // Automatically approve commissions below this amount
        AUTO_APPROVE_COMMISSION_MAX: 1000, // ₹1000
        // Automatically approve withdrawals below this amount
        AUTO_APPROVE_WITHDRAWAL_MAX: 5000, // ₹5000
        // Time before auto-cancellation (in hours)
        AUTO_CANCEL_PENDING_PAYMENT: 24,
        // Time before auto-expiration (in days)
        AUTO_EXPIRE_PENDING_COMMISSION: 30
    },

    // Status validation functions
    isValidOrderStatus: (status) => {
        return Object.values(PAYMENT_STATUS.ORDER).includes(status);
    },

    isValidWithdrawalStatus: (status) => {
        return Object.values(PAYMENT_STATUS.WITHDRAWAL).includes(status);
    },

    isValidCommissionStatus: (status) => {
        return Object.values(PAYMENT_STATUS.COMMISSION).includes(status);
    },

    isValidRefundStatus: (status) => {
        return Object.values(PAYMENT_STATUS.REFUND).includes(status);
    },

    canTransition: (fromStatus, toStatus, type = 'ORDER') => {
        const flow = PAYMENT_STATUS.FLOWS[type];
        if (!flow || !flow[fromStatus]) {
            return false;
        }
        return flow[fromStatus].includes(toStatus);
    },

    getStatusDescription: (status, type = 'ORDER') => {
        const key = type.toLowerCase() + '_' + status;
        return PAYMENT_STATUS.DESCRIPTIONS[key] || PAYMENT_STATUS.DESCRIPTIONS[status] || 'Unknown status';
    },

    getStatusColor: (status) => {
        return PAYMENT_STATUS.COLORS[status] || '#6B7280';
    },

    getStatusIcon: (status) => {
        return PAYMENT_STATUS.ICONS[status] || '❓';
    },

    getStatusPriority: (status) => {
        return PAYMENT_STATUS.PRIORITIES[status] || 99;
    },

    // Status groups
    getSuccessStatuses: () => {
        return ['completed', 'paid', 'approved'];
    },

    getPendingStatuses: () => {
        return ['pending', 'processing', 'approved'];
    },

    getFailedStatuses: () => {
        return ['failed', 'rejected', 'cancelled', 'expired'];
    },

    getRefundStatuses: () => {
        return ['refunded', 'partially_refunded'];
    },

    // Check if status indicates completion
    isCompleted: (status) => {
        return PAYMENT_STATUS.getSuccessStatuses().includes(status);
    },

    isPending: (status) => {
        return PAYMENT_STATUS.getPendingStatuses().includes(status);
    },

    isFailed: (status) => {
        return PAYMENT_STATUS.getFailedStatuses().includes(status);
    },

    isRefunded: (status) => {
        return PAYMENT_STATUS.getRefundStatuses().includes(status);
    },

    // Payment method constants
    PAYMENT_METHODS: {
        RAZORPAY: 'razorpay',
        WALLET: 'wallet',
        BANK_TRANSFER: 'bank_transfer',
        UPI: 'upi',
        PAYPAL: 'paypal',
        CASH_ON_DELIVERY: 'cod',
        CARD: 'card',
        NET_BANKING: 'net_banking'
    },

    // Currency constants
    CURRENCIES: {
        INR: 'INR',
        USD: 'USD',
        EUR: 'EUR',
        GBP: 'GBP'
    },

    // Default currency
    DEFAULT_CURRENCY: 'INR',

    // Currency symbols
    CURRENCY_SYMBOLS: {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
    },

    // Currency conversion rates (example rates)
    CONVERSION_RATES: {
        'INR': 1,
        'USD': 0.012,
        'EUR': 0.011,
        'GBP': 0.0095
    },

    // Format amount with currency
    formatAmount: (amount, currency = 'INR') => {
        const symbol = PAYMENT_STATUS.CURRENCY_SYMBOLS[currency] || currency;
        if (currency === 'INR') {
            return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },

    // Convert amount between currencies
    convertAmount: (amount, fromCurrency, toCurrency) => {
        const fromRate = PAYMENT_STATUS.CONVERSION_RATES[fromCurrency] || 1;
        const toRate = PAYMENT_STATUS.CONVERSION_RATES[toCurrency] || 1;
        return (amount / fromRate) * toRate;
    }
};

module.exports = PAYMENT_STATUS;