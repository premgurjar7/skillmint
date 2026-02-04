const { body, param, query, validationResult } = require('express-validator');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const validate = (validations) => {
    return async (req, res, next) => {
        try {
            // Run all validations
            await Promise.all(validations.map(validation => validation.run(req)));

            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                const errorMessages = errors.array().map(error => ({
                    field: error.param,
                    message: error.msg,
                    value: error.value
                }));
                
                logger.warn(`Validation failed: ${JSON.stringify(errorMessages)}`);
                return ResponseHandler.sendValidationError(res, errorMessages);
            }

            next();
        } catch (error) {
            logger.error(`Validation middleware error: ${error.message}`);
            return ResponseHandler.sendInternalError(res, error);
        }
    };
};

// Common validation rules
const validationRules = {
    // User validations
    register: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]*$/).withMessage('Name can only contain letters and spaces'),
        
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please enter a valid email address')
            .normalizeEmail(),
        
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        
        body('phone')
            .trim()
            .notEmpty().withMessage('Phone number is required')
            .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
        
        body('role')
            .optional()
            .isIn(['student', 'instructor', 'affiliate']).withMessage('Invalid role specified'),
        
        body('referralCode')
            .optional()
            .trim()
            .isLength({ min: 6, max: 12 }).withMessage('Referral code must be between 6 and 12 characters')
    ],

    login: [
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please enter a valid email address'),
        
        body('password')
            .notEmpty().withMessage('Password is required')
    ],

    updateProfile: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
        
        body('phone')
            .optional()
            .trim()
            .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
        
        body('bio')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
        
        body('socialLinks.facebook')
            .optional()
            .isURL().withMessage('Please enter a valid Facebook URL'),
        
        body('socialLinks.twitter')
            .optional()
            .isURL().withMessage('Please enter a valid Twitter URL'),
        
        body('socialLinks.linkedin')
            .optional()
            .isURL().withMessage('Please enter a valid LinkedIn URL'),
        
        body('socialLinks.instagram')
            .optional()
            .isURL().withMessage('Please enter a valid Instagram URL')
    ],

    changePassword: [
        body('currentPassword')
            .notEmpty().withMessage('Current password is required'),
        
        body('newPassword')
            .notEmpty().withMessage('New password is required')
            .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
        
        body('confirmPassword')
            .notEmpty().withMessage('Please confirm your new password')
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('Passwords do not match');
                }
                return true;
            })
    ],

    forgotPassword: [
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please enter a valid email address')
    ],

    resetPassword: [
        body('token')
            .notEmpty().withMessage('Reset token is required'),
        
        body('password')
            .notEmpty().withMessage('New password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        
        body('confirmPassword')
            .notEmpty().withMessage('Please confirm your new password')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            })
    ],

    // Course validations
    createCourse: [
        body('title')
            .trim()
            .notEmpty().withMessage('Course title is required')
            .isLength({ min: 10, max: 200 }).withMessage('Title must be between 10 and 200 characters'),
        
        body('description')
            .trim()
            .notEmpty().withMessage('Course description is required')
            .isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters'),
        
        body('shortDescription')
            .trim()
            .notEmpty().withMessage('Short description is required')
            .isLength({ max: 500 }).withMessage('Short description cannot exceed 500 characters'),
        
        body('price')
            .notEmpty().withMessage('Price is required')
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        
        body('category')
            .notEmpty().withMessage('Category is required')
            .isIn([
                'web-development',
                'mobile-development',
                'data-science',
                'machine-learning',
                'digital-marketing',
                'graphic-design',
                'business',
                'finance',
                'health',
                'lifestyle',
                'other'
            ]).withMessage('Invalid category'),
        
        body('level')
            .notEmpty().withMessage('Level is required')
            .isIn(['beginner', 'intermediate', 'advanced', 'all-levels'])
            .withMessage('Invalid level'),
        
        body('affiliateCommission')
            .optional()
            .isFloat({ min: 0, max: 50 }).withMessage('Affiliate commission must be between 0 and 50'),
        
        body('instructorShare')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Instructor share must be between 0 and 100')
    ],

    updateCourse: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('title')
            .optional()
            .trim()
            .isLength({ min: 10, max: 200 }).withMessage('Title must be between 10 and 200 characters'),
        
        body('description')
            .optional()
            .trim()
            .isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters'),
        
        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        
        body('status')
            .optional()
            .isIn(['draft', 'published', 'archived', 'rejected'])
            .withMessage('Invalid status')
    ],

    // Payment validations
    createOrder: [
        body('courseId')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('referralCode')
            .optional()
            .trim()
            .isLength({ min: 6, max: 12 }).withMessage('Invalid referral code format'),
        
        body('couponCode')
            .optional()
            .trim()
            .isLength({ min: 3, max: 20 }).withMessage('Invalid coupon code format'),
        
        body('paymentMethod')
            .optional()
            .isIn(['razorpay', 'wallet', 'cod']).withMessage('Invalid payment method')
    ],

    verifyPayment: [
        body('razorpay_order_id')
            .notEmpty().withMessage('Razorpay order ID is required'),
        
        body('razorpay_payment_id')
            .notEmpty().withMessage('Razorpay payment ID is required'),
        
        body('razorpay_signature')
            .notEmpty().withMessage('Razorpay signature is required')
    ],

    // Wallet validations
    addFunds: [
        body('amount')
            .notEmpty().withMessage('Amount is required')
            .isFloat({ min: 100 }).withMessage('Minimum amount is ₹100')
            .isFloat({ max: 50000 }).withMessage('Maximum amount is ₹50,000'),
        
        body('paymentMethod')
            .notEmpty().withMessage('Payment method is required')
            .isIn(['razorpay', 'bank_transfer', 'upi']).withMessage('Invalid payment method')
    ],

    // Withdrawal validations
    requestWithdrawal: [
        body('amount')
            .notEmpty().withMessage('Amount is required')
            .isFloat({ min: 100 }).withMessage('Minimum withdrawal amount is ₹100')
            .isFloat({ max: 50000 }).withMessage('Maximum withdrawal amount is ₹50,000'),
        
        body('paymentMethod')
            .notEmpty().withMessage('Payment method is required')
            .isIn(['bank_transfer', 'upi', 'paypal']).withMessage('Invalid payment method'),
        
        body('paymentDetails.accountNumber')
            .if(body('paymentMethod').equals('bank_transfer'))
            .notEmpty().withMessage('Account number is required for bank transfer')
            .matches(/^\d{9,18}$/).withMessage('Invalid account number'),
        
        body('paymentDetails.ifscCode')
            .if(body('paymentMethod').equals('bank_transfer'))
            .notEmpty().withMessage('IFSC code is required for bank transfer')
            .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format'),
        
        body('paymentDetails.upiId')
            .if(body('paymentMethod').equals('upi'))
            .notEmpty().withMessage('UPI ID is required')
            .matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)
            .withMessage('Invalid UPI ID format'),
        
        body('paymentDetails.paypalEmail')
            .if(body('paymentMethod').equals('paypal'))
            .notEmpty().withMessage('PayPal email is required')
            .isEmail().withMessage('Invalid PayPal email address')
    ],

    // Admin validations
    updateUserStatus: [
        param('id')
            .notEmpty().withMessage('User ID is required')
            .isMongoId().withMessage('Invalid user ID'),
        
        body('isActive')
            .optional()
            .isBoolean().withMessage('isActive must be a boolean'),
        
        body('role')
            .optional()
            .isIn(['student', 'instructor', 'affiliate', 'admin']).withMessage('Invalid role')
    ],

    updateWithdrawalStatus: [
        param('id')
            .notEmpty().withMessage('Withdrawal ID is required')
            .isMongoId().withMessage('Invalid withdrawal ID'),
        
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['approved', 'rejected', 'processing', 'completed']).withMessage('Invalid status'),
        
        body('adminNotes')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
        
        body('transactionId')
            .optional()
            .trim()
            .isLength({ min: 5, max: 50 }).withMessage('Transaction ID must be between 5 and 50 characters')
    ],

    // Search and filter validations
    searchCourses: [
        query('q')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
        
        query('category')
            .optional()
            .isIn([
                'web-development',
                'mobile-development',
                'data-science',
                'machine-learning',
                'digital-marketing',
                'graphic-design',
                'business',
                'finance',
                'health',
                'lifestyle',
                'other'
            ]).withMessage('Invalid category'),
        
        query('level')
            .optional()
            .isIn(['beginner', 'intermediate', 'advanced', 'all-levels'])
            .withMessage('Invalid level'),
        
        query('minPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
        
        query('maxPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
        
        query('rating')
            .optional()
            .isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
        
        query('sortBy')
            .optional()
            .isIn(['price', 'rating', 'createdAt', 'popularity']).withMessage('Invalid sort field'),
        
        query('sortOrder')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
        
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],

    // File upload validations
    uploadFile: [
        body('fileType')
            .notEmpty().withMessage('File type is required')
            .isIn(['image', 'video', 'document']).withMessage('Invalid file type'),
        
        body('maxSize')
            .optional()
            .isInt({ min: 1024, max: 50 * 1024 * 1024 }) // 1KB to 50MB
            .withMessage('Max size must be between 1KB and 50MB')
    ],

    // Review validations
    createReview: [
        param('courseId')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('rating')
            .notEmpty().withMessage('Rating is required')
            .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        
        body('comment')
            .optional()
            .trim()
            .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
    ],

    // Query param validations
    mongoIdParam: [
        param('id')
            .notEmpty().withMessage('ID is required')
            .isMongoId().withMessage('Invalid ID format')
    ],

    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt(),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt(),
        
        query('sortBy')
            .optional()
            .trim(),
        
        query('sortOrder')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
    ]
};

// Custom validators
const customValidators = {
    isFutureDate: (value) => {
        if (!value) return true;
        const date = new Date(value);
        return date > new Date();
    },

    isPastDate: (value) => {
        if (!value) return true;
        const date = new Date(value);
        return date < new Date();
    },

    isArrayOfStrings: (value) => {
        if (!value) return true;
        if (!Array.isArray(value)) return false;
        return value.every(item => typeof item === 'string' && item.trim().length > 0);
    },

    isArrayOfNumbers: (value) => {
        if (!value) return true;
        if (!Array.isArray(value)) return false;
        return value.every(item => typeof item === 'number');
    },

    isValidURL: (value) => {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },

    isValidPercentage: (value) => {
        if (!value) return true;
        return value >= 0 && value <= 100;
    },

    isValidPrice: (value) => {
        if (!value) return true;
        return value >= 0 && value <= 1000000; // Max 10 lakh
    },

    isValidPhone: (value) => {
        if (!value) return true;
        return /^[0-9]{10}$/.test(value);
    },

    isValidPincode: (value) => {
        if (!value) return true;
        return /^[1-9][0-9]{5}$/.test(value);
    }
};

// Middleware to validate specific fields
const validateField = (field, rules) => {
    return (req, res, next) => {
        const value = req.body[field];
        
        if (rules.required && !value) {
            return ResponseHandler.sendBadRequest(res, `${field} is required`);
        }
        
        if (value) {
            // Add more validation logic based on rules
            if (rules.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
                return ResponseHandler.sendBadRequest(res, `Invalid ${field} format`);
            }
            
            if (rules.type === 'phone' && !/^[0-9]{10}$/.test(value)) {
                return ResponseHandler.sendBadRequest(res, `Invalid ${field} format`);
            }
            
            if (rules.minLength && value.length < rules.minLength) {
                return ResponseHandler.sendBadRequest(res, 
                    `${field} must be at least ${rules.minLength} characters`
                );
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
                return ResponseHandler.sendBadRequest(res, 
                    `${field} cannot exceed ${rules.maxLength} characters`
                );
            }
        }
        
        next();
    };
};

module.exports = {
    validate,
    validationRules,
    customValidators,
    validateField
};