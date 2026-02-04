const express = require('express');
const router = express.Router();
const AuthService = require('../services/auth.service');
const authValidation = require('../validations/auth.validation');
const { authenticate, authenticateRefreshToken, optionalAuth, rateLimitAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    rateLimitAuth,
    validate(authValidation.register),
    async (req, res) => {
        try {
            const { referralCode, ...userData } = req.body;
            const result = await AuthService.register(userData, referralCode);
            
            ResponseHandler.sendCreated(res, 'Registration successful', result);
        } catch (error) {
            logger.error(`Register error: ${error.message}`);
            ResponseHandler.sendError(res, error.message, null, 400);
        }
    }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
    '/login',
    rateLimitAuth,
    validate(authValidation.login),
    async (req, res) => {
        try {
            const { email, password } = req.body;
            const result = await AuthService.login(email, password);
            
            ResponseHandler.sendSuccess(res, 'Login successful', result);
        } catch (error) {
            logger.error(`Login error: ${error.message}`);
            ResponseHandler.sendError(res, error.message, null, 401);
        }
    }
);

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public (with refresh token)
router.post(
    '/refresh-token',
    validate(authValidation.refreshToken),
    authenticateRefreshToken,
    async (req, res) => {
        try {
            const { refreshToken } = req.body;
            const result = await AuthService.refreshTokens(refreshToken);
            
            ResponseHandler.sendSuccess(res, 'Token refreshed', result);
        } catch (error) {
            logger.error(`Refresh token error: ${error.message}`);
            ResponseHandler.sendError(res, error.message, null, 401);
        }
    }
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post(
    '/logout',
    authenticate,
    validate(authValidation.logout),
    async (req, res) => {
        try {
            const { refreshToken } = req.body;
            const result = await AuthService.logout(req.user._id, refreshToken);
            
            ResponseHandler.sendSuccess(res, 'Logout successful', result);
        } catch (error) {
            logger.error(`Logout error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - send reset email
// @access  Public
router.post(
    '/forgot-password',
    rateLimitAuth,
    validate(authValidation.forgotPassword),
    async (req, res) => {
        try {
            const { email } = req.body;
            const result = await AuthService.forgotPassword(email);
            
            ResponseHandler.sendSuccess(res, 'Password reset email sent', result);
        } catch (error) {
            logger.error(`Forgot password error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
    '/reset-password',
    validate(authValidation.resetPassword),
    async (req, res) => {
        try {
            const { token, password } = req.body;
            const result = await AuthService.resetPassword(token, password);
            
            ResponseHandler.sendSuccess(res, 'Password reset successful', result);
        } catch (error) {
            logger.error(`Reset password error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/change-password
// @desc    Change password (logged in users)
// @access  Private
router.post(
    '/change-password',
    authenticate,
    validate(authValidation.changePassword),
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const result = await AuthService.changePassword(
                req.user._id,
                currentPassword,
                newPassword
            );
            
            ResponseHandler.sendSuccess(res, 'Password changed successfully', result);
        } catch (error) {
            logger.error(`Change password error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.get(
    '/verify-email/:token',
    async (req, res) => {
        try {
            const { token } = req.params;
            const result = await AuthService.verifyEmail(token);
            
            ResponseHandler.sendSuccess(res, 'Email verified successfully', result);
        } catch (error) {
            logger.error(`Verify email error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Private
router.post(
    '/resend-verification',
    authenticate,
    validate(authValidation.resendVerification),
    async (req, res) => {
        try {
            const { type, email, phone } = req.body;
            
            if (type === 'email') {
                const result = await AuthService.resendVerificationEmail(email || req.user.email);
                ResponseHandler.sendSuccess(res, 'Verification email sent', result);
            } else if (type === 'phone') {
                // Implement phone verification resend
                ResponseHandler.sendSuccess(res, 'OTP sent to phone');
            } else {
                ResponseHandler.sendBadRequest(res, 'Invalid verification type');
            }
        } catch (error) {
            logger.error(`Resend verification error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get(
    '/profile',
    authenticate,
    async (req, res) => {
        try {
            const user = await AuthService.getUserById(req.user._id);
            ResponseHandler.sendSuccess(res, 'Profile retrieved', user);
        } catch (error) {
            logger.error(`Get profile error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
    '/profile',
    authenticate,
    validate(authValidation.updateProfile),
    async (req, res) => {
        try {
            const result = await AuthService.updateProfile(req.user._id, req.body);
            ResponseHandler.sendSuccess(res, 'Profile updated successfully', result);
        } catch (error) {
            logger.error(`Update profile error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/switch-role
// @desc    Switch user role
// @access  Private
router.post(
    '/switch-role',
    authenticate,
    validate(authValidation.switchRole),
    async (req, res) => {
        try {
            const { newRole } = req.body;
            const result = await AuthService.switchRole(req.user._id, newRole);
            
            ResponseHandler.sendSuccess(res, 'Role switched successfully', result);
        } catch (error) {
            logger.error(`Switch role error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/request-affiliate
// @desc    Request affiliate status
// @access  Private
router.post(
    '/request-affiliate',
    authenticate,
    validate(authValidation.requestAffiliate),
    async (req, res) => {
        try {
            const result = await AuthService.requestAffiliate(req.user._id, req.body);
            ResponseHandler.sendSuccess(res, 'Affiliate request submitted', result);
        } catch (error) {
            logger.error(`Request affiliate error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete(
    '/account',
    authenticate,
    validate(authValidation.deleteAccount),
    async (req, res) => {
        try {
            const { password } = req.body;
            const result = await AuthService.deleteAccount(req.user._id, password);
            
            ResponseHandler.sendSuccess(res, 'Account deleted successfully', result);
        } catch (error) {
            logger.error(`Delete account error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/check-email
// @desc    Check email availability
// @access  Public
router.get(
    '/check-email',
    validate(authValidation.checkEmail, ['query']),
    async (req, res) => {
        try {
            const { email } = req.query;
            const user = await User.findOne({ email });
            
            ResponseHandler.sendSuccess(res, 'Email check completed', {
                email,
                available: !user
            });
        } catch (error) {
            logger.error(`Check email error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/check-phone
// @desc    Check phone availability
// @access  Public
router.get(
    '/check-phone',
    validate(authValidation.checkPhone, ['query']),
    async (req, res) => {
        try {
            const { phone } = req.query;
            const user = await User.findOne({ phone });
            
            ResponseHandler.sendSuccess(res, 'Phone check completed', {
                phone,
                available: !user
            });
        } catch (error) {
            logger.error(`Check phone error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/verify-phone
// @desc    Verify phone number with OTP
// @access  Private
router.post(
    '/verify-phone',
    authenticate,
    validate(authValidation.verifyPhone),
    async (req, res) => {
        try {
            const { otp } = req.body;
            const result = await AuthService.verifyPhoneOTP(req.user._id, otp);
            
            ResponseHandler.sendSuccess(res, 'Phone verified successfully', result);
        } catch (error) {
            logger.error(`Verify phone error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/send-phone-otp
// @desc    Send OTP to phone
// @access  Private
router.post(
    '/send-phone-otp',
    authenticate,
    async (req, res) => {
        try {
            const result = await AuthService.sendPhoneOTP(req.user.phone);
            ResponseHandler.sendSuccess(res, 'OTP sent successfully', result);
        } catch (error) {
            logger.error(`Send phone OTP error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/validate-referral
// @desc    Validate referral code
// @access  Public
router.post(
    '/validate-referral',
    validate(authValidation.validateReferral),
    async (req, res) => {
        try {
            const { referralCode } = req.body;
            const referrer = await User.findOne({ referralCode });
            
            if (!referrer) {
                return ResponseHandler.sendNotFound(res, 'Referral code not found');
            }
            
            ResponseHandler.sendSuccess(res, 'Referral code valid', {
                referralCode,
                referrer: {
                    name: referrer.name,
                    role: referrer.role
                }
            });
        } catch (error) {
            logger.error(`Validate referral error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/stats
// @desc    Get auth statistics (Admin only)
// @access  Private/Admin
router.get(
    '/stats',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const stats = await AuthService.getUserStats();
            ResponseHandler.sendSuccess(res, 'Auth statistics retrieved', stats);
        } catch (error) {
            logger.error(`Get auth stats error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/users
// @desc    Get users list (Admin only)
// @access  Private/Admin
router.get(
    '/users',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, role, isActive } = req.query;
            
            const filters = { search, role, isActive };
            const pagination = { page: parseInt(page), limit: parseInt(limit) };
            
            const result = await AuthService.searchUsers(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Users retrieved', result.users, result.pagination);
        } catch (error) {
            logger.error(`Get users error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/auth/users/:id/status
// @desc    Update user status (Admin only)
// @access  Private/Admin
router.put(
    '/users/:id/status',
    authenticate,
    authorize('admin'),
    validate(authValidation.updateUserStatus),
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await AuthService.updateUserStatus(id, req.body);
            
            ResponseHandler.sendSuccess(res, 'User status updated', result);
        } catch (error) {
            logger.error(`Update user status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/auth/session
// @desc    Check session status
// @access  Private
router.get(
    '/session',
    authenticate,
    async (req, res) => {
        try {
            ResponseHandler.sendSuccess(res, 'Session active', {
                user: {
                    _id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role,
                    isEmailVerified: req.user.isEmailVerified,
                    isPhoneVerified: req.user.isPhoneVerified
                },
                session: {
                    active: true,
                    lastLogin: req.user.lastLogin
                }
            });
        } catch (error) {
            logger.error(`Check session error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/auth/test-email
// @desc    Test email service (Admin only)
// @access  Private/Admin
router.post(
    '/test-email',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { email } = req.body;
            const result = await MailService.testEmailService(email || req.user.email);
            
            ResponseHandler.sendSuccess(res, 'Test email sent', result);
        } catch (error) {
            logger.error(`Test email error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;