const jwt = require('../config/jwt');
const { User } = require('../config/db');
const { ResponseHandler, ResponseMessages } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return ResponseHandler.sendUnauthorized(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return ResponseHandler.sendUnauthorized(res, 'Invalid token format');
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verifyToken(token, 'access');
        } catch (error) {
            if (error.message === 'Token expired') {
                return ResponseHandler.sendUnauthorized(res, ResponseMessages.TOKEN_EXPIRED);
            }
            return ResponseHandler.sendUnauthorized(res, ResponseMessages.INVALID_TOKEN);
        }

        // Check if user exists and is active
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return ResponseHandler.sendUnauthorized(res, 'User not found');
        }

        if (!user.isActive) {
            return ResponseHandler.sendForbidden(res, 'Account is deactivated');
        }

        // Check if password was changed after token was issued
        // (You can add iat in token payload and check here)

        // Attach user to request
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;

        logger.info(`User authenticated: ${user._id} (${user.role})`);
        next();
    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const authenticateRefreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return ResponseHandler.sendUnauthorized(res, 'Refresh token required');
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verifyToken(refreshToken, 'refresh');
        } catch (error) {
            return ResponseHandler.sendUnauthorized(res, 'Invalid refresh token');
        }

        // Check if user exists
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return ResponseHandler.sendUnauthorized(res, 'User not found');
        }

        if (!user.isActive) {
            return ResponseHandler.sendForbidden(res, 'Account is deactivated');
        }

        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;

        next();
    } catch (error) {
        logger.error(`Refresh token authentication error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            
            try {
                const decoded = jwt.verifyToken(token, 'access');
                const user = await User.findById(decoded.userId).select('-password');
                
                if (user && user.isActive) {
                    req.user = user;
                    req.userId = user._id;
                    req.userRole = user.role;
                    req.isAuthenticated = true;
                }
            } catch (error) {
                // Token is invalid, but we don't throw error for optional auth
                req.isAuthenticated = false;
            }
        }
        
        next();
    } catch (error) {
        logger.error(`Optional authentication error: ${error.message}`);
        next();
    }
};

const verifyEmail = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (!req.user.isEmailVerified) {
            return ResponseHandler.sendForbidden(res, 'Please verify your email address');
        }

        next();
    } catch (error) {
        logger.error(`Email verification middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const verifyPhone = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        if (!req.user.isPhoneVerified) {
            return ResponseHandler.sendForbidden(res, 'Please verify your phone number');
        }

        next();
    } catch (error) {
        logger.error(`Phone verification middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const requirePasswordChange = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Authentication required');
        }

        // Check if password needs to be changed (e.g., after 90 days)
        const passwordAge = 90; // days
        const lastPasswordChange = req.user.passwordChangedAt || req.user.createdAt;
        const daysSinceChange = (Date.now() - lastPasswordChange) / (1000 * 60 * 60 * 24);

        if (daysSinceChange > passwordAge) {
            return ResponseHandler.sendForbidden(res, 'Password needs to be changed');
        }

        next();
    } catch (error) {
        logger.error(`Password change middleware error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const validateSession = async (req, res, next) => {
    try {
        if (!req.user) {
            return ResponseHandler.sendUnauthorized(res, 'Session expired');
        }

        // Check last activity (optional - can be implemented with session management)
        const maxInactivity = 30 * 60 * 1000; // 30 minutes
        
        if (req.user.lastLogin && (Date.now() - req.user.lastLogin.getTime()) > maxInactivity) {
            return ResponseHandler.sendUnauthorized(res, 'Session expired due to inactivity');
        }

        // Update last activity
        await User.findByIdAndUpdate(req.user._id, {
            lastLogin: new Date()
        });

        next();
    } catch (error) {
        logger.error(`Session validation error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const checkBanStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        // Check if user is banned (you can add isBanned field to User model)
        // if (req.user.isBanned) {
        //     return ResponseHandler.sendForbidden(res, 'Account is banned');
        // }

        next();
    } catch (error) {
        logger.error(`Ban status check error: ${error.message}`);
        return ResponseHandler.sendInternalError(res, error);
    }
};

const rateLimitAuth = (req, res, next) => {
    // This is a simple rate limiter for auth endpoints
    // In production, use express-rate-limit or similar package
    
    const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 5; // 5 requests per window
    
    const ip = req.ip;
    const path = req.path;
    
    // Create a simple rate limit store (in production, use Redis)
    if (!req.app.locals.rateLimit) {
        req.app.locals.rateLimit = {};
    }
    
    const key = `${ip}:${path}`;
    const now = Date.now();
    
    if (!req.app.locals.rateLimit[key]) {
        req.app.locals.rateLimit[key] = {
            count: 1,
            startTime: now
        };
    } else {
        const windowStart = req.app.locals.rateLimit[key].startTime;
        
        if (now - windowStart > rateLimitWindow) {
            // Reset window
            req.app.locals.rateLimit[key] = {
                count: 1,
                startTime: now
            };
        } else {
            req.app.locals.rateLimit[key].count++;
            
            if (req.app.locals.rateLimit[key].count > maxRequests) {
                return ResponseHandler.sendTooManyRequests(res, 'Too many login attempts. Please try again later.');
            }
        }
    }
    
    next();
};

module.exports = {
    authenticate,
    authenticateRefreshToken,
    optionalAuth,
    verifyEmail,
    verifyPhone,
    requirePasswordChange,
    validateSession,
    checkBanStatus,
    rateLimitAuth
};