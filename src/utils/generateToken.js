const crypto = require('crypto');
const jwt = require('../config/jwt');

const generateTokens = (userId, role) => {
    try {
        const accessToken = jwt.generateAccessToken(userId, role);
        const refreshToken = jwt.generateRefreshToken(userId, role);
        
        return {
            accessToken,
            refreshToken,
            accessTokenExpiry: Date.now() + (15 * 60 * 1000), // 15 minutes
            refreshTokenExpiry: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        };
    } catch (error) {
        throw error;
    }
};

const generateResetToken = () => {
    try {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        
        const resetTokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
        
        return {
            resetToken,
            hashedToken,
            resetTokenExpiry
        };
    } catch (error) {
        throw error;
    }
};

const generateVerificationToken = () => {
    try {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');
        
        const verificationTokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        return {
            verificationToken,
            hashedToken,
            verificationTokenExpiry
        };
    } catch (error) {
        throw error;
    }
};

const generateApiKey = () => {
    try {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const prefix = 'skm_';
        return prefix + apiKey;
    } catch (error) {
        throw error;
    }
};

const generateOtp = (length = 6) => {
    try {
        const digits = '0123456789';
        let otp = '';
        
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * 10)];
        }
        
        return otp;
    } catch (error) {
        throw error;
    }
};

const generateRandomString = (length = 10) => {
    try {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return result;
    } catch (error) {
        throw error;
    }
};

const generateOrderId = () => {
    try {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `ORD${timestamp}${random}`;
    } catch (error) {
        throw error;
    }
};

const generateTransactionId = () => {
    try {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `TXN${timestamp}${random}`;
    } catch (error) {
        throw error;
    }
};

const generateWithdrawalId = () => {
    try {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `WDR${timestamp}${random}`;
    } catch (error) {
        throw error;
    }
};

const generateCouponCode = () => {
    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Generate 2 letters
        for (let i = 0; i < 2; i++) {
            code += chars.charAt(Math.floor(Math.random() * 26));
        }
        
        // Generate 4 numbers
        for (let i = 0; i < 4; i++) {
            code += Math.floor(Math.random() * 10);
        }
        
        // Generate 2 more letters
        for (let i = 0; i < 2; i++) {
            code += chars.charAt(Math.floor(Math.random() * 26));
        }
        
        return code;
    } catch (error) {
        throw error;
    }
};

const generateSecurePassword = (length = 12) => {
    try {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        const allChars = lowercase + uppercase + numbers + symbols;
        let password = '';
        
        // Ensure at least one of each character type
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        // Fill the rest with random characters
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        // Shuffle the password
        password = password.split('').sort(() => Math.random() - 0.5).join('');
        
        return password;
    } catch (error) {
        throw error;
    }
};

const generateSlug = (text) => {
    try {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/--+/g, '-') // Replace multiple hyphens with single
            .trim(); // Trim whitespace
    } catch (error) {
        throw error;
    }
};

const generateUniqueCode = (prefix = '') => {
    try {
        const timestamp = Date.now().toString(36); // Base36 timestamp
        const random = Math.random().toString(36).substr(2, 9); // Random string
        return prefix + timestamp + random;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generateTokens,
    generateResetToken,
    generateVerificationToken,
    generateApiKey,
    generateOtp,
    generateRandomString,
    generateOrderId,
    generateTransactionId,
    generateWithdrawalId,
    generateCouponCode,
    generateSecurePassword,
    generateSlug,
    generateUniqueCode
};