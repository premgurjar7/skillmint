// src/services/auth.service.js - BASIC VERSION
const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    static async register(userData, referralCode = null) {
        // Simple implementation
        const user = new User({
            ...userData,
            password: await bcrypt.hash(userData.password, 10)
        });
        
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'default-secret',
            { expiresIn: '7d' }
        );
        
        return { user, token };
    }
    
    static async login(email, password) {
        const user = await User.findOne({ email });
        if (!user) throw new Error('User not found');
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error('Invalid password');
        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'default-secret',
            { expiresIn: '7d' }
        );
        
        return { user, token };
    }
}

module.exports = AuthService;