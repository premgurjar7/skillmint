const { body, param, query } = require('express-validator');
const { WithdrawRequest, User, Wallet } = require('../config/db');

const withdrawValidation = {
    // Request withdrawal validation
    requestWithdrawal: [
        body('amount')
            .notEmpty().withMessage('Amount is required')
            .isFloat({ min: 100 }).withMessage('Minimum withdrawal amount is ₹100')
            .isFloat({ max: 50000 }).withMessage('Maximum withdrawal amount is ₹50,000')
            .toFloat()
            .custom(async (amount, { req }) => {
                if (!req.user) {
                    throw new Error('Authentication required');
                }

                // Check wallet balance
                const user = await User.findById(req.user._id);
                if (!user) {
                    throw new Error('User not found');
                }

                if (user.walletBalance < amount) {
                    throw new Error('Insufficient wallet balance');
                }

                // Check minimum balance after withdrawal
                const minBalanceAfterWithdrawal = 0; // Can be configured
                if ((user.walletBalance - amount) < minBalanceAfterWithdrawal) {
                    throw new Error(`Minimum balance of ₹${minBalanceAfterWithdrawal} must be maintained`);
                }

                // Check if there are pending withdrawals
                const pendingWithdrawals = await WithdrawRequest.countDocuments({
                    user: req.user._id,
                    status: { $in: ['pending', 'processing'] }
                });

                if (pendingWithdrawals > 0) {
                    throw new Error('You have pending withdrawal requests. Please wait for them to be processed.');
                }

                return true;
            }),

        body('paymentMethod')
            .notEmpty().withMessage('Payment method is required')
            .isIn(['bank_transfer', 'upi', 'paypal']).withMessage('Invalid payment method'),

        body('paymentDetails.accountNumber')
            .if(body('paymentMethod').equals('bank_transfer'))
            .notEmpty().withMessage('Account number is required for bank transfer')
            .matches(/^\d{9,18}$/).withMessage('Invalid account number (9-18 digits)'),

        body('paymentDetails.accountHolderName')
            .if(body('paymentMethod').equals('bank_transfer'))
            .notEmpty().withMessage('Account holder name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Account holder name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s]+$/).withMessage('Account holder name can only contain letters and spaces'),

        body('paymentDetails.bankName')
            .if(body('paymentMethod').equals('bank_transfer'))
            .notEmpty().withMessage('Bank name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Bank name must be between 2 and 100 characters'),

        body('paymentDetails.ifscCode')
            .if(body('paymentMethod').equals('bank_transfer'))
            .notEmpty().withMessage('IFSC code is required')
            .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format')
            .toUpperCase(),

        body('paymentDetails.upiId')
            .if(body('paymentMethod').equals('upi'))
            .notEmpty().withMessage('UPI ID is required')
            .matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)
            .withMessage('Invalid UPI ID format')
            .toLowerCase(),

        body('paymentDetails.paypalEmail')
            .if(body('paymentMethod').equals('paypal'))
            .notEmpty().withMessage('PayPal email is required')
            .isEmail().withMessage('Invalid PayPal email address')
            .normalizeEmail(),

        body('paymentDetails.transactionNote')
            .optional()
            .trim()
            .isLength({ max: 100 }).withMessage('Transaction note cannot exceed 100 characters'),

        body('userNotes')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
    ],

    // Update withdrawal status (admin)
    updateWithdrawalStatus: [
        param('id')
            .notEmpty().withMessage('Withdrawal ID is required')
            .isMongoId().withMessage('Invalid withdrawal ID')
            .custom(async (withdrawalId, { req }) => {
                const withdrawal = await WithdrawRequest.findById(withdrawalId);
                if (!withdrawal) {
                    throw new Error('Withdrawal request not found');
                }
                req.withdrawal = withdrawal;
                return true;
            }),

        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['approved', 'rejected', 'processing', 'completed', 'cancelled'])
            .withMessage('Invalid status')
            .custom(async (status, { req }) => {
                if (!req.withdrawal) {
                    throw new Error('Withdrawal request not found');
                }

                const currentStatus = req.withdrawal.status;
                const validTransitions = {
                    'pending': ['approved', 'rejected', 'cancelled'],
                    'approved': ['processing', 'rejected'],
                    'processing': ['completed', 'rejected'],
                    'completed': [],
                    'rejected': [],
                    'cancelled': []
                };

                if (!validTransitions[currentStatus]?.includes(status)) {
                    throw new Error(`Cannot change status from ${currentStatus} to ${status}`);
                }

                return true;
            }),

        body('adminNotes')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Admin notes cannot exceed 500 characters'),

        body('transactionId')
            .if(body('status').equals('completed'))
            .notEmpty().withMessage('Transaction ID is required for completed status')
            .trim()
            .isLength({ min: 5, max: 50 }).withMessage('Transaction ID must be between 5 and 50 characters'),

        body('receiptUrl')
            .optional()
            .isURL().withMessage('Please provide a valid receipt URL'),

        body('failureReason')
            .if(body('status').equals('rejected'))
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Failure reason cannot exceed 500 characters')
    ],

    // Cancel withdrawal (user)
    cancelWithdrawal: [
        param('id')
            .notEmpty().withMessage('Withdrawal ID is required')
            .isMongoId().withMessage('Invalid withdrawal ID')
            .custom(async (withdrawalId, { req }) => {
                if (!req.user) {
                    throw new Error('Authentication required');
                }

                const withdrawal = await WithdrawRequest.findOne({
                    _id: withdrawalId,
                    user: req.user._id
                });

                if (!withdrawal) {
                    throw new Error('Withdrawal request not found');
                }

                if (withdrawal.status !== 'pending') {
                    throw new Error('Only pending withdrawals can be cancelled');
                }

                req.withdrawal = withdrawal;
                return true;
            })
    ],

    // Get withdrawal history
    getWithdrawalHistory: [
        query('status')
            .optional()
            .isIn(['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'])
            .withMessage('Invalid status'),

        query('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date format'),

        query('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date format')
            .custom((endDate, { req }) => {
                if (req.query.startDate && endDate && new Date(endDate) < new Date(req.query.startDate)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            }),

        query('paymentMethod')
            .optional()
            .isIn(['bank_transfer', 'upi', 'paypal']).withMessage('Invalid payment method'),

        query('minAmount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Minimum amount must be a positive number')
            .toFloat(),

        query('maxAmount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Maximum amount must be a positive number')
            .toFloat()
            .custom((maxAmount, { req }) => {
                if (req.query.minAmount && maxAmount && maxAmount < req.query.minAmount) {
                    throw new Error('Maximum amount must be greater than minimum amount');
                }
                return true;
            }),

        query('sortBy')
            .optional()
            .isIn(['amount', 'createdAt', 'updatedAt', 'processedAt'])
            .withMessage('Invalid sort field'),

        query('sortOrder')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
            .default('desc'),

        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt()
            .default(1),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt()
            .default(10)
    ],

    // Get withdrawal statistics
    getWithdrawalStats: [
        query('userId')
            .optional()
            .isMongoId().withMessage('Invalid user ID'),

        query('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date format'),

        query('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date format'),

        query('groupBy')
            .optional()
            .isIn(['day', 'week', 'month', 'year', 'paymentMethod', 'status'])
            .withMessage('Invalid group by value')
    ],

    // Bulk withdrawal processing (admin)
    bulkProcessWithdrawals: [
        body('withdrawalIds')
            .notEmpty().withMessage('Withdrawal IDs are required')
            .isArray({ min: 1 }).withMessage('At least one withdrawal ID is required')
            .custom(async (withdrawalIds, { req }) => {
                if (withdrawalIds.length > 50) {
                    throw new Error('Maximum 50 withdrawals allowed for bulk processing');
                }

                // Validate each ID
                for (const id of withdrawalIds) {
                    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                        throw new Error(`Invalid withdrawal ID: ${id}`);
                    }

                    const withdrawal = await WithdrawRequest.findById(id);
                    if (!withdrawal) {
                        throw new Error(`Withdrawal not found: ${id}`);
                    }

                    if (withdrawal.status !== 'pending') {
                        throw new Error(`Withdrawal ${id} is not in pending status`);
                    }
                }

                return true;
            }),

        body('action')
            .notEmpty().withMessage('Action is required')
            .isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),

        body('adminNotes')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Admin notes cannot exceed 500 characters'),

        body('failureReason')
            .if(body('action').equals('reject'))
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Failure reason cannot exceed 500 characters')
    ],

    // Validate bank details
    validateBankDetails: [
        body('accountNumber')
            .notEmpty().withMessage('Account number is required')
            .matches(/^\d{9,18}$/).withMessage('Invalid account number (9-18 digits)'),

        body('accountHolderName')
            .notEmpty().withMessage('Account holder name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Account holder name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s]+$/).withMessage('Account holder name can only contain letters and spaces'),

        body('bankName')
            .notEmpty().withMessage('Bank name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Bank name must be between 2 and 100 characters'),

        body('ifscCode')
            .notEmpty().withMessage('IFSC code is required')
            .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format')
            .toUpperCase()
    ],

    // Validate UPI details
    validateUPIDetails: [
        body('upiId')
            .notEmpty().withMessage('UPI ID is required')
            .matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)
            .withMessage('Invalid UPI ID format')
            .toLowerCase()
            .custom(async (upiId, { req }) => {
                if (!req.user) {
                    throw new Error('Authentication required');
                }

                // Check if UPI ID is already used by another user
                const existingUser = await User.findOne({
                    'withdrawalDetails.upiId': upiId,
                    _id: { $ne: req.user._id }
                });

                if (existingUser) {
                    throw new Error('This UPI ID is already registered with another account');
                }

                return true;
            })
    ],

    // Validate PayPal details
    validatePayPalDetails: [
        body('paypalEmail')
            .notEmpty().withMessage('PayPal email is required')
            .isEmail().withMessage('Invalid PayPal email address')
            .normalizeEmail()
            .custom(async (paypalEmail, { req }) => {
                if (!req.user) {
                    throw new Error('Authentication required');
                }

                // Check if PayPal email is already used by another user
                const existingUser = await User.findOne({
                    'withdrawalDetails.paypalEmail': paypalEmail,
                    _id: { $ne: req.user._id }
                });

                if (existingUser) {
                    throw new Error('This PayPal email is already registered with another account');
                }

                return true;
            })
    ],

    // Update withdrawal settings (admin)
    updateWithdrawalSettings: [
        body('minWithdrawalAmount')
            .optional()
            .isFloat({ min: 100 }).withMessage('Minimum withdrawal amount must be at least ₹100')
            .toFloat(),

        body('maxWithdrawalAmount')
            .optional()
            .isFloat({ min: 100 }).withMessage('Maximum withdrawal amount must be at least ₹100')
            .toFloat()
            .custom((maxAmount, { req }) => {
                if (req.body.minWithdrawalAmount && maxAmount && maxAmount < req.body.minWithdrawalAmount) {
                    throw new Error('Maximum amount must be greater than minimum amount');
                }
                return true;
            }),

        body('processingFeePercentage')
            .optional()
            .isFloat({ min: 0, max: 10 }).withMessage('Processing fee percentage must be between 0% and 10%')
            .toFloat(),

        body('minProcessingFee')
            .optional()
            .isFloat({ min: 0 }).withMessage('Minimum processing fee must be a positive number')
            .toFloat(),

        body('processingTimeDays')
            .optional()
            .isInt({ min: 1, max: 30 }).withMessage('Processing time must be between 1 and 30 days')
            .toInt(),

        body('allowedPaymentMethods')
            .optional()
            .isArray().withMessage('Allowed payment methods must be an array')
            .custom((methods) => {
                const validMethods = ['bank_transfer', 'upi', 'paypal'];
                if (methods && !methods.every(method => validMethods.includes(method))) {
                    throw new Error('Invalid payment method in allowed payment methods');
                }
                return true;
            }),

        body('isWithdrawalEnabled')
            .optional()
            .isBoolean().withMessage('isWithdrawalEnabled must be a boolean')
            .toBoolean(),

        body('autoApproveThreshold')
            .optional()
            .isFloat({ min: 0 }).withMessage('Auto approve threshold must be a positive number')
            .toFloat(),

        body('kycRequired')
            .optional()
            .isBoolean().withMessage('kycRequired must be a boolean')
            .toBoolean()
    ],

    // Export withdrawal data (admin)
    exportWithdrawals: [
        query('format')
            .optional()
            .isIn(['csv', 'excel', 'json']).withMessage('Invalid export format')
            .default('json'),

        query('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date format'),

        query('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date format'),

        query('status')
            .optional()
            .isIn(['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'])
            .withMessage('Invalid status'),

        query('paymentMethod')
            .optional()
            .isIn(['bank_transfer', 'upi', 'paypal']).withMessage('Invalid payment method')
    ],

    // Get withdrawal limits
    getWithdrawalLimits: [
        query('userId')
            .optional()
            .isMongoId().withMessage('Invalid user ID')
            .custom(async (userId, { req }) => {
                if (userId) {
                    const user = await User.findById(userId);
                    if (!user) {
                        throw new Error('User not found');
                    }
                    req.targetUser = user;
                }
                return true;
            })
    ],

    // Check withdrawal eligibility
    checkEligibility: [
        body('amount')
            .notEmpty().withMessage('Amount is required')
            .isFloat({ min: 0 }).withMessage('Amount must be a positive number')
            .toFloat()
            .custom(async (amount, { req }) => {
                if (!req.user) {
                    throw new Error('Authentication required');
                }

                const user = await User.findById(req.user._id);
                if (!user) {
                    throw new Error('User not found');
                }

                // Get withdrawal settings (in real app, from database)
                const settings = {
                    minAmount: 100,
                    maxAmount: 50000,
                    processingFeePercentage: 2,
                    minProcessingFee: 10
                };

                if (amount < settings.minAmount) {
                    throw new Error(`Minimum withdrawal amount is ₹${settings.minAmount}`);
                }

                if (amount > settings.maxAmount) {
                    throw new Error(`Maximum withdrawal amount is ₹${settings.maxAmount}`);
                }

                if (user.walletBalance < amount) {
                    throw new Error('Insufficient wallet balance');
                }

                // Calculate processing fee
                const processingFee = Math.max(
                    (amount * settings.processingFeePercentage) / 100,
                    settings.minProcessingFee
                );

                const netAmount = amount - processingFee;

                return true;
            })
    ]
};

module.exports = withdrawValidation;