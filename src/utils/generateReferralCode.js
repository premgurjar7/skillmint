const crypto = require('crypto');

const generateReferralCode = (name, userId) => {
    try {
        if (!name || !userId) {
            throw new Error('Name and userId are required');
        }
        
        // Extract first 3 letters of name (uppercase)
        const namePart = name.substring(0, 3).toUpperCase();
        
        // Get first 4 characters of userId hash
        const userIdHash = crypto
            .createHash('md5')
            .update(userId.toString())
            .digest('hex')
            .substring(0, 4)
            .toUpperCase();
        
        // Generate random 3 characters
        const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
        
        // Combine all parts
        const referralCode = `${namePart}${userIdHash}${randomPart}`;
        
        return referralCode;
    } catch (error) {
        throw error;
    }
};

const generateAffiliateLink = (referralCode) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'https://skillmint.com';
        return `${baseUrl}/signup?ref=${referralCode}`;
    } catch (error) {
        throw error;
    }
};

const validateReferralCode = (referralCode) => {
    try {
        if (!referralCode || typeof referralCode !== 'string') {
            return false;
        }
        
        // Check length (10 characters)
        if (referralCode.length !== 10) {
            return false;
        }
        
        // Check format: 3 letters + 4 hex + 3 letters
        const pattern = /^[A-Z]{3}[A-F0-9]{4}[A-Z]{3}$/;
        return pattern.test(referralCode);
    } catch (error) {
        return false;
    }
};

const generateCustomReferralCode = (userId, options = {}) => {
    try {
        const {
            prefix = 'SKL',
            includeDate = true,
            includeRandom = true,
            length = 8
        } = options;
        
        let code = prefix;
        
        // Add date component (YYMMDD)
        if (includeDate) {
            const now = new Date();
            const datePart = now.getFullYear().toString().substr(-2) +
                           (now.getMonth() + 1).toString().padStart(2, '0') +
                           now.getDate().toString().padStart(2, '0');
            code += datePart;
        }
        
        // Add user ID component
        const userIdPart = userId.toString().substr(-4).padStart(4, '0');
        code += userIdPart;
        
        // Add random component if needed
        if (includeRandom) {
            const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
            code += randomPart;
        }
        
        // Trim to desired length
        code = code.substring(0, length).toUpperCase();
        
        return code;
    } catch (error) {
        throw error;
    }
};

const generateBulkReferralCodes = (count, prefix = 'REF') => {
    try {
        const codes = new Set();
        
        while (codes.size < count) {
            const code = generateUniqueReferralCode(prefix);
            codes.add(code);
        }
        
        return Array.from(codes);
    } catch (error) {
        throw error;
    }
};

const generateUniqueReferralCode = (prefix = '') => {
    try {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        const code = prefix + timestamp + random;
        
        // Ensure code is not too long
        return code.substring(0, 12);
    } catch (error) {
        throw error;
    }
};

const generateShortReferralCode = () => {
    try {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Generate 6 character code
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return code;
    } catch (error) {
        throw error;
    }
};

const generateMemorableReferralCode = () => {
    try {
        const adjectives = [
            'HAPPY', 'SMART', 'QUICK', 'BRAVE', 'CLEAN', 'FRESH', 'GREAT', 'HOT', 'JOLLY', 
            'KIND', 'LUCKY', 'NICE', 'PROUD', 'RICH', 'SAFE', 'TALL', 'WISE', 'YOUNG', 'ZESTY'
        ];
        
        const nouns = [
            'LION', 'TIGER', 'BEAR', 'WOLF', 'EAGLE', 'SHARK', 'HAWK', 'FOX', 'OWL', 'DEER',
            'STAR', 'MOON', 'SUN', 'SKY', 'SEA', 'SNOW', 'RAIN', 'WIND', 'FIRE', 'ICE'
        ];
        
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        return `${randomAdjective}${randomNoun}${randomNumber}`;
    } catch (error) {
        throw error;
    }
};

// Export functions
module.exports = {
    generateReferralCode,
    generateAffiliateLink,
    validateReferralCode,
    generateCustomReferralCode,
    generateBulkReferralCodes,
    generateUniqueReferralCode,
    generateShortReferralCode,
    generateMemorableReferralCode
};