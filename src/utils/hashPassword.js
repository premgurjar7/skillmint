const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const hashPassword = async (password) => {
    try {
        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        return hashedPassword;
    } catch (error) {
        throw error;
    }
};

const comparePassword = async (password, hashedPassword) => {
    try {
        if (!password || !hashedPassword) {
            throw new Error('Password and hashed password are required');
        }
        
        const isMatch = await bcrypt.compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        throw error;
    }
};

const hashWithSHA256 = (data) => {
    try {
        if (!data) {
            throw new Error('Data is required for hashing');
        }
        
        const hash = crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');
        
        return hash;
    } catch (error) {
        throw error;
    }
};

const hashWithMD5 = (data) => {
    try {
        if (!data) {
            throw new Error('Data is required for hashing');
        }
        
        const hash = crypto
            .createHash('md5')
            .update(data)
            .digest('hex');
        
        return hash;
    } catch (error) {
        throw error;
    }
};

const generateSalt = async (rounds = 10) => {
    try {
        const salt = await bcrypt.genSalt(rounds);
        return salt;
    } catch (error) {
        throw error;
    }
};

const hashWithSalt = async (password, salt) => {
    try {
        if (!password || !salt) {
            throw new Error('Password and salt are required');
        }
        
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        throw error;
    }
};

const validatePasswordStrength = (password) => {
    try {
        if (!password) {
            return {
                isValid: false,
                message: 'Password is required',
                score: 0
            };
        }
        
        let score = 0;
        const messages = [];
        
        // Check length
        if (password.length >= 8) {
            score += 1;
        } else {
            messages.push('Password should be at least 8 characters long');
        }
        
        // Check for lowercase letters
        if (/[a-z]/.test(password)) {
            score += 1;
        } else {
            messages.push('Password should contain at least one lowercase letter');
        }
        
        // Check for uppercase letters
        if (/[A-Z]/.test(password)) {
            score += 1;
        } else {
            messages.push('Password should contain at least one uppercase letter');
        }
        
        // Check for numbers
        if (/[0-9]/.test(password)) {
            score += 1;
        } else {
            messages.push('Password should contain at least one number');
        }
        
        // Check for special characters
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            score += 1;
        } else {
            messages.push('Password should contain at least one special character');
        }
        
        // Determine strength
        let strength = 'weak';
        if (score === 5) strength = 'very strong';
        else if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        
        return {
            isValid: score >= 3,
            score,
            strength,
            messages: messages.length > 0 ? messages : ['Password strength is good']
        };
    } catch (error) {
        throw error;
    }
};

const generatePasswordHash = async (password, algorithm = 'bcrypt') => {
    try {
        if (!password) {
            throw new Error('Password is required');
        }
        
        switch (algorithm.toLowerCase()) {
            case 'bcrypt':
                return await hashPassword(password);
                
            case 'sha256':
                return hashWithSHA256(password);
                
            case 'md5':
                return hashWithMD5(password);
                
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    } catch (error) {
        throw error;
    }
};

const verifyPasswordHash = async (password, hash, algorithm = 'bcrypt') => {
    try {
        if (!password || !hash) {
            throw new Error('Password and hash are required');
        }
        
        switch (algorithm.toLowerCase()) {
            case 'bcrypt':
                return await comparePassword(password, hash);
                
            case 'sha256':
                const hashedPassword = hashWithSHA256(password);
                return hashedPassword === hash;
                
            case 'md5':
                const md5Hash = hashWithMD5(password);
                return md5Hash === hash;
                
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    } catch (error) {
        throw error;
    }
};

const createPasswordResetHash = async (email, timestamp) => {
    try {
        if (!email || !timestamp) {
            throw new Error('Email and timestamp are required');
        }
        
        const data = `${email}:${timestamp}:${process.env.PASSWORD_RESET_SECRET || 'reset-secret'}`;
        const hash = crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');
        
        return hash;
    } catch (error) {
        throw error;
    }
};

const verifyPasswordResetHash = async (email, timestamp, hash) => {
    try {
        if (!email || !timestamp || !hash) {
            throw new Error('Email, timestamp, and hash are required');
        }
        
        const calculatedHash = await createPasswordResetHash(email, timestamp);
        return calculatedHash === hash;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    hashPassword,
    comparePassword,
    hashWithSHA256,
    hashWithMD5,
    generateSalt,
    hashWithSalt,
    validatePasswordStrength,
    generatePasswordHash,
    verifyPasswordHash,
    createPasswordResetHash,
    verifyPasswordResetHash
};