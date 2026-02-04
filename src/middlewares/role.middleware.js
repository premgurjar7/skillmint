const { ResponseHandler, ResponseMessages } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return ResponseHandler.sendUnauthorized(res, 'Authentication required');
            }

            if (!allowedRoles.includes(req.user.role)) {
                logger.warn(`Unauthorized access attempt by ${req.user._id} (${req.user.role}) to ${req.method} ${req.originalUrl}`);
                return ResponseHandler.sendForbidden(res, 'You do not have permission to access this resource');
            }

            next();
        } catch (error) {
            logger.error(`Authorization middleware error: ${error.message}`);
            return ResponseHandler.sendInternalError(res, error);
        }
    };
};

const isAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (req.user.role !== 'admin') {
            return ResponseHandler.sendForbidden(res, 'Admin access required');
        }

        next();
    } catch (error) {
        logger.error(`Admin middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const isInstructor = (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (req.user.role !== 'instructor') {
            return ResponseHandler.sendForbidden(res, 'Instructor access required');
        }

        next();
    } catch (error) {
        logger.error(`Instructor middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const isAffiliate = (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (req.user.role !== 'affiliate') {
            return ResponseHandler.sendForbidden(res, 'Affiliate access required');
        }

        next();
    } catch (error) {
        logger.error(`Affiliate middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const isStudent = (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (req.user.role !== 'student') {
            return ResponseHandler.sendForbidden(res, 'Student access required');
        }

        next();
    } catch (error) {
        logger.error(`Student middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const isInstructorOrAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (!['instructor', 'admin'].includes(req.user.role)) {
            return ResponseHandler.sendForbidden(res, 'Instructor or admin access required');
        }

        next();
    } catch (error) {
        logger.error(`InstructorOrAdmin middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const isAffiliateOrAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (!['affiliate', 'admin'].includes(req.user.role)) {
            return ResponseHandler.sendForbidden(res, 'Affiliate or admin access required');
        }

        next();
    } catch (error) {
        logger.error(`AffiliateOrAdmin middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const canManageCourse = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        const courseId = req.params.id || req.body.courseId;
        
        if (!courseId) {
            return ResponseHandler.sendBadRequest(res, 'Course ID is required');
        }

        const { Course } = require('../config/db');
        const course = await Course.findById(courseId);

        if (!course) {
            return ResponseHandler.sendNotFound(res, 'Course');
        }

        // Admin can manage all courses
        if (req.user.role === 'admin') {
            req.course = course;
            return next();
        }

        // Instructor can only manage their own courses
        if (req.user.role === 'instructor' && course.instructor.toString() === req.user._id.toString()) {
            req.course = course;
            return next();
        }

        return ResponseHandler.sendForbidden(res, 'You do not have permission to manage this course');
    } catch (error) {
        logger.error(`Course management middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const canViewCourse = async (req, res, next) => {
    try {
        const courseId = req.params.id || req.query.courseId;
        
        if (!courseId) {
            return ResponseHandler.sendBadRequest(res, 'Course ID is required');
        }

        const { Course } = require('../config/db');
        const course = await Course.findById(courseId);

        if (!course) {
            return ResponseHandler.sendNotFound(res, 'Course');
        }

        // Public courses can be viewed by anyone
        if (course.isPublished && course.status === 'published') {
            req.course = course;
            return next();
        }

        // Check if user is authenticated
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required to view this course');
        }

        // Admin can view all courses
        if (req.user.role === 'admin') {
            req.course = course;
            return next();
        }

        // Instructor can view their own courses
        if (req.user.role === 'instructor' && course.instructor.toString() === req.user._id.toString()) {
            req.course = course;
            return next();
        }

        // Check if student is enrolled
        if (req.user.role === 'student') {
            const { Order } = require('../config/db');
            const enrollment = await Order.findOne({
                user: req.user._id,
                course: course._id,
                paymentStatus: 'completed',
                orderStatus: 'completed'
            });

            if (enrollment) {
                req.course = course;
                return next();
            }
        }

        return ResponseHandler.sendForbidden(res, 'You do not have permission to view this course');
    } catch (error) {
        logger.error(`Course view middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const canAccessUserData = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        const targetUserId = req.params.userId || req.query.userId;
        
        if (!targetUserId) {
            return ResponseHandler.sendBadRequest(res, 'User ID is required');
        }

        // Users can access their own data
        if (targetUserId === req.user._id.toString()) {
            return next();
        }

        // Admin can access all user data
        if (req.user.role === 'admin') {
            return next();
        }

        // Instructors can access data of students enrolled in their courses
        if (req.user.role === 'instructor') {
            const { Order, Course } = require('../config/db');
            
            // Check if the target user is enrolled in any of instructor's courses
            const instructorCourses = await Course.find({ instructor: req.user._id }).select('_id');
            const courseIds = instructorCourses.map(course => course._id);
            
            const enrollment = await Order.findOne({
                user: targetUserId,
                course: { $in: courseIds },
                paymentStatus: 'completed'
            });

            if (enrollment) {
                return next();
            }
        }

        return ResponseHandler.sendForbidden(res, 'You do not have permission to access this user data');
    } catch (error) {
        logger.error(`User data access middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const canManageWithdrawal = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        const withdrawalId = req.params.id || req.body.withdrawalId;
        
        if (!withdrawalId) {
            return ResponseHandler.sendBadRequest(res, 'Withdrawal ID is required');
        }

        const { WithdrawRequest } = require('../config/db');
        const withdrawal = await WithdrawRequest.findById(withdrawalId);

        if (!withdrawal) {
            return ResponseHandler.sendNotFound(res, 'Withdrawal request');
        }

        // Users can manage their own withdrawals
        if (withdrawal.user.toString() === req.user._id.toString()) {
            req.withdrawal = withdrawal;
            return next();
        }

        // Admin can manage all withdrawals
        if (req.user.role === 'admin') {
            req.withdrawal = withdrawal;
            return next();
        }

        return ResponseHandler.sendForbidden(res, 'You do not have permission to manage this withdrawal');
    } catch (error) {
        logger.error(`Withdrawal management middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const hasMinimumBalance = (minimumAmount) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return ResponseHandler.sendUnauthorized(res, 'Authentication required');
            }

            if (req.user.walletBalance < minimumAmount) {
                return ResponseHandler.sendForbidden(res, `Minimum balance of ₹${minimumAmount} required`);
            }

            next();
        } catch (error) {
            logger.error(`Minimum balance middleware error: ${error.message}`);
            return ResponseHandler.sendInternalError(res, error);
        }
    };
};

const checkApiKey = (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        
        if (!apiKey) {
            return ResponseHandler.sendUnauthorized(res, 'API key required');
        }

        // Validate API key (you can store valid API keys in environment or database)
        const validApiKeys = process.env.VALID_API_KEYS ? 
            process.env.VALID_API_KEYS.split(',') : [];
        
        if (!validApiKeys.includes(apiKey)) {
            return ResponseHandler.sendUnauthorized(res, 'Invalid API key');
        }

        next();
    } catch (error) {
        logger.error(`API key middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

module.exports = {
    authorize,
    isAdmin,
    isInstructor,
    isAffiliate,
    isStudent,
    isInstructorOrAdmin,
    isAffiliateOrAdmin,
    canManageCourse,
    canViewCourse,
    canAccessUserData,
    canManageWithdrawal,
    hasMinimumBalance,
    checkApiKey
};