const { ResponseHandler, ResponseMessages } = require('../utils/responseHandler');
const { User } = require('../config/db');
const logger = require('../utils/logger');
const { validateReferralCode } = require('../utils/generateReferralCode');

const validateReferral = async (req, res, next) => {
    try {
        const { referralCode } = req.body;
        
        if (!referralCode) {
            return next(); // No referral code is okay
        }

        // Validate referral code format
        if (!validateReferralCode(referralCode)) {
            return ResponseHandler.sendBadRequest(res, 'Invalid referral code format');
        }

        // Check if referral code exists
        const referrer = await User.findOne({ referralCode });
        
        if (!referrer) {
            return ResponseHandler.sendNotFound(res, 'Referral code not found');
        }

        // Check if referrer is active
        if (!referrer.isActive) {
            return ResponseHandler.sendBadRequest(res, 'Referrer account is inactive');
        }

        // Check if referrer can refer (based on role or other criteria)
        if (!['affiliate', 'instructor', 'admin'].includes(referrer.role)) {
            return ResponseHandler.sendBadRequest(res, 'This user cannot refer others');
        }

        // Check if user is referring themselves
        if (req.user && referrer._id.toString() === req.user._id.toString()) {
            return ResponseHandler.sendBadRequest(res, 'Cannot use your own referral code');
        }

        // Check if referral code has reached its limit
        const maxReferrals = 50; // You can make this configurable
        const referralCount = await User.countDocuments({ referredBy: referrer._id });
        
        if (referralCount >= maxReferrals) {
            return ResponseHandler.sendBadRequest(res, 'Referral code has reached its limit');
        }

        req.referrer = referrer;
        next();
    } catch (error) {
        logger.error(`Referral validation error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const trackReferral = async (req, res, next) => {
    try {
        const { referralCode } = req.body;
        
        if (!referralCode) {
            return next();
        }

        // Store referral info in session/cookie for later use
        // This is useful when user signs up after clicking referral link
        res.cookie('referral_code', referralCode, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Store in session if using sessions
        if (req.session) {
            req.session.referralCode = referralCode;
        }

        next();
    } catch (error) {
        logger.error(`Referral tracking error: ${error.message}`);
        next(); // Don't fail the request if tracking fails
    }
};

const applyReferralBonus = async (req, res, next) => {
    try {
        if (!req.user || !req.referrer) {
            return next();
        }

        // Check if user was already referred
        if (req.user.referredBy) {
            return next();
        }

        // Apply referral to user
        req.user.referredBy = req.referrer._id;
        await req.user.save();

        // Apply welcome bonus to new user (optional)
        const welcomeBonus = 100; // ₹100 welcome bonus
        req.user.walletBalance += welcomeBonus;
        await req.user.save();

        logger.info(`Referral applied: ${req.user._id} referred by ${req.referrer._id}`);
        
        // You can also create a referral record or send notification here

        next();
    } catch (error) {
        logger.error(`Referral bonus application error: ${error.message}`);
        next(); // Don't fail the request if bonus application fails
    }
};

const checkSelfReferral = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        const { referralCode } = req.body;
        
        if (!referralCode) {
            return next();
        }

        // Check if user is trying to use their own referral code
        if (req.user.referralCode === referralCode) {
            return ResponseHandler.sendBadRequest(res, 'Cannot use your own referral code');
        }

        next();
    } catch (error) {
        logger.error(`Self-referral check error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const validateAffiliateLink = async (req, res, next) => {
    try {
        const { ref } = req.query;
        
        if (!ref) {
            return next();
        }

        // Validate referral code
        if (!validateReferralCode(ref)) {
            return ResponseHandler.sendBadRequest(res, 'Invalid affiliate link');
        }

        // Check if affiliate exists and is active
        const affiliate = await User.findOne({ 
            referralCode: ref,
            role: 'affiliate',
            isActive: true 
        });

        if (!affiliate) {
            return ResponseHandler.sendNotFound(res, 'Affiliate not found or inactive');
        }

        req.affiliate = affiliate;
        
        // Track affiliate click
        // You can store this in a separate collection for analytics
        logger.info(`Affiliate link clicked: ${ref} by IP: ${req.ip}`);

        next();
    } catch (error) {
        logger.error(`Affiliate link validation error: ${error.message}`);
        next(); // Don't fail the request for affiliate link validation
    }
};

const multiLevelReferral = async (req, res, next) => {
    try {
        if (!req.user || !req.user.referredBy) {
            return next();
        }

        // Get referral chain (multi-level marketing)
        const referralChain = [];
        let currentUserId = req.user.referredBy;
        
        // Get up to 3 levels
        for (let level = 1; level <= 3; level++) {
            if (!currentUserId) break;
            
            const referrer = await User.findById(currentUserId).select('_id referralCode referredBy role');
            
            if (!referrer || !referrer.isActive) break;
            
            // Only affiliates and instructors get multi-level commissions
            if (!['affiliate', 'instructor', 'admin'].includes(referrer.role)) break;
            
            referralChain.push({
                level,
                userId: referrer._id,
                referralCode: referrer.referralCode
            });
            
            currentUserId = referrer.referredBy;
        }

        req.referralChain = referralChain;
        next();
    } catch (error) {
        logger.error(`Multi-level referral error: ${error.message}`);
        next(); // Don't fail the request
    }
};

const checkReferralEligibility = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        const { courseId } = req.params;
        
        if (!courseId) {
            return ResponseHandler.sendBadRequest(res, 'Course ID is required');
        }

        const { Course, Order } = require('../config/db');
        
        // Check if user was referred
        if (!req.user.referredBy) {
            return ResponseHandler.sendBadRequest(res, 'No referral found for this user');
        }

        // Check if referrer is still active
        const referrer = await User.findById(req.user.referredBy);
        
        if (!referrer || !referrer.isActive) {
            return ResponseHandler.sendBadRequest(res, 'Referrer is no longer active');
        }

        // Check if referrer can receive commissions for this course
        const course = await Course.findById(courseId);
        
        if (!course) {
            return ResponseHandler.sendNotFound(res, 'Course');
        }

        // Check if user already purchased this course
        const existingOrder = await Order.findOne({
            user: req.user._id,
            course: courseId,
            paymentStatus: 'completed'
        });

        if (existingOrder) {
            return ResponseHandler.sendBadRequest(res, 'You have already purchased this course');
        }

        // Check if referrer has already received commission for referring this user
        const existingCommission = await Order.findOne({
            user: req.user._id,
            referralUsed: referrer._id,
            paymentStatus: 'completed'
        });

        if (existingCommission) {
            return ResponseHandler.sendBadRequest(res, 'Referral commission already processed for this user');
        }

        req.referrer = referrer;
        req.course = course;
        next();
    } catch (error) {
        logger.error(`Referral eligibility check error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const affiliateDashboardAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        // Check if user is affiliate or has affiliate permissions
        if (req.user.role !== 'affiliate' && req.user.role !== 'admin') {
            // Check if user has been converted to affiliate
            const hasAffiliateAccess = false; // You can add a field like 'hasAffiliateAccess' to User model
            
            if (!hasAffiliateAccess) {
                return ResponseHandler.sendForbidden(res, 'Affiliate dashboard access required');
            }
        }

        // Check minimum requirements for affiliate dashboard
        const minimumReferredUsers = 1; // Configurable
        const referredUsersCount = await User.countDocuments({ referredBy: req.user._id });
        
        if (referredUsersCount < minimumReferredUsers && req.user.role !== 'admin') {
            return ResponseHandler.sendForbidden(res, `Minimum ${minimumReferredUsers} referred users required`);
        }

        next();
    } catch (error) {
        logger.error(`Affiliate dashboard access error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const commissionTracking = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        // Track commission-related activities
        const { commissionId, action } = req.body;
        
        if (commissionId && action) {
            logger.info(`Commission ${action}: ${commissionId} by user ${req.user._id}`);
            
            // You can add more detailed tracking here
            // For example, store in a tracking collection
        }

        next();
    } catch (error) {
        logger.error(`Commission tracking error: ${error.message}`);
        next(); // Don't fail the request
    }
};

module.exports = {
    validateReferral,
    trackReferral,
    applyReferralBonus,
    checkSelfReferral,
    validateAffiliateLink,
    multiLevelReferral,
    checkReferralEligibility,
    affiliateDashboardAccess,
    commissionTracking
};