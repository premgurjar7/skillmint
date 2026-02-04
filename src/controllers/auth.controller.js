const AuthService = require('../services/auth.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Register user
exports.register = async (req, res) => {
    try {
        const { referralCode, ...userData } = req.body;
        const result = await AuthService.register(userData, referralCode);
        
        ResponseHandler.sendCreated(res, 'Registration successful', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message, null, 400);
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        
        ResponseHandler.sendSuccess(res, 'Login successful', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message, null, 401);
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await AuthService.refreshTokens(refreshToken);
        
        ResponseHandler.sendSuccess(res, 'Token refreshed', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message, null, 401);
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await AuthService.logout(req.user._id, refreshToken);
        
        ResponseHandler.sendSuccess(res, 'Logout successful', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await AuthService.forgotPassword(email);
        
        ResponseHandler.sendSuccess(res, 'Password reset email sent', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const result = await AuthService.resetPassword(token, password);
        
        ResponseHandler.sendSuccess(res, 'Password reset successful', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await AuthService.changePassword(
            req.user._id,
            currentPassword,
            newPassword
        );
        
        ResponseHandler.sendSuccess(res, 'Password changed successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Verify email
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await AuthService.verifyEmail(token);
        
        ResponseHandler.sendSuccess(res, 'Email verified successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Resend verification
exports.resendVerification = async (req, res) => {
    try {
        const { type, email, phone } = req.body;
        
        if (type === 'email') {
            const result = await AuthService.resendVerificationEmail(email || req.user.email);
            ResponseHandler.sendSuccess(res, 'Verification email sent', result);
        } else if (type === 'phone') {
            // Phone verification logic
            ResponseHandler.sendSuccess(res, 'OTP sent to phone');
        } else {
            ResponseHandler.sendBadRequest(res, 'Invalid verification type');
        }
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await AuthService.getUserById(req.user._id);
        ResponseHandler.sendSuccess(res, 'Profile retrieved', user);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const result = await AuthService.updateProfile(req.user._id, req.body);
        ResponseHandler.sendSuccess(res, 'Profile updated successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Switch role
exports.switchRole = async (req, res) => {
    try {
        const { newRole } = req.body;
        const result = await AuthService.switchRole(req.user._id, newRole);
        
        ResponseHandler.sendSuccess(res, 'Role switched successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Request affiliate status
exports.requestAffiliate = async (req, res) => {
    try {
        const result = await AuthService.requestAffiliate(req.user._id, req.body);
        ResponseHandler.sendSuccess(res, 'Affiliate request submitted', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Delete account
exports.deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        const result = await AuthService.deleteAccount(req.user._id, password);
        
        ResponseHandler.sendSuccess(res, 'Account deleted successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Check email availability
exports.checkEmail = async (req, res) => {
    try {
        const { email } = req.query;
        const isAvailable = await AuthService.checkEmailAvailability(email);
        
        ResponseHandler.sendSuccess(res, 'Email check completed', {
            email,
            available: isAvailable
        });
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Check phone availability
exports.checkPhone = async (req, res) => {
    try {
        const { phone } = req.query;
        const isAvailable = await AuthService.checkPhoneAvailability(phone);
        
        ResponseHandler.sendSuccess(res, 'Phone check completed', {
            phone,
            available: isAvailable
        });
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Verify phone with OTP
exports.verifyPhone = async (req, res) => {
    try {
        const { otp } = req.body;
        const result = await AuthService.verifyPhoneOTP(req.user._id, otp);
        
        ResponseHandler.sendSuccess(res, 'Phone verified successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Send phone OTP
exports.sendPhoneOTP = async (req, res) => {
    try {
        const result = await AuthService.sendPhoneOTP(req.user.phone);
        ResponseHandler.sendSuccess(res, 'OTP sent successfully', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Validate referral code
exports.validateReferral = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const referrer = await AuthService.validateReferralCode(referralCode);
        
        ResponseHandler.sendSuccess(res, 'Referral code valid', {
            referralCode,
            referrer: {
                name: referrer.name,
                role: referrer.role
            }
        });
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get user statistics (Admin)
exports.getUserStats = async (req, res) => {
    try {
        const stats = await AuthService.getUserStats();
        ResponseHandler.sendSuccess(res, 'User statistics retrieved', stats);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Search users (Admin)
exports.searchUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, isActive } = req.query;
        
        const filters = { search, role, isActive };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await AuthService.searchUsers(filters, pagination);
        ResponseHandler.sendPaginated(res, 'Users retrieved', result.users, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update user status (Admin)
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await AuthService.updateUserStatus(id, req.body);
        
        ResponseHandler.sendSuccess(res, 'User status updated', result);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Check session status
exports.checkSession = async (req, res) => {
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
        ResponseHandler.sendError(res, error.message);
    }
};