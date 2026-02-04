const jwt = require('jsonwebtoken');

const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'skillmint-api',
    audience: process.env.JWT_AUDIENCE || 'skillmint-app'
};

const generateToken = (payload, type = 'access') => {
    try {
        const options = {
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        };

        if (type === 'access') {
            options.expiresIn = JWT_CONFIG.accessExpiry;
            return jwt.sign(payload, JWT_CONFIG.secret, options);
        } else if (type === 'refresh') {
            options.expiresIn = JWT_CONFIG.refreshExpiry;
            return jwt.sign(payload, JWT_CONFIG.secret, options);
        } else {
            throw new Error('Invalid token type');
        }
    } catch (error) {
        throw error;
    }
};

const verifyToken = (token, type = 'access') => {
    try {
        const options = {
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        };
        
        const decoded = jwt.verify(token, JWT_CONFIG.secret, options);
        
        // Additional checks based on token type
        if (type === 'refresh' && !decoded.isRefresh) {
            throw new Error('Invalid refresh token');
        }
        
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

const generateAccessToken = (userId, role) => {
    const payload = {
        userId,
        role,
        type: 'access'
    };
    
    return generateToken(payload, 'access');
};

const generateRefreshToken = (userId, role) => {
    const payload = {
        userId,
        role,
        type: 'refresh',
        isRefresh: true
    };
    
    return generateToken(payload, 'refresh');
};

const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    JWT_CONFIG,
    generateToken,
    verifyToken,
    generateAccessToken,
    generateRefreshToken,
    decodeToken
};