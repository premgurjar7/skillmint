// ============================================
// 🚀 SKILLMINT BACKEND - FINAL FIXED VERSION
// ============================================
console.log('\n🚀 Starting SkillMint Backend...');
console.log('='.repeat(50));

require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ============================================
// 📦 MIDDLEWARE
// ============================================
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://skillmint-lakn.onrender.com'],
    credentials: true
}));

app.use(express.json());

// ============================================
// 🔌 MONGODB CONNECTION - FIXED
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pgbhai259_db_user:bhai7877@cluster0.rxrmtyb.mongodb.net/skillmint?retryWrites=true&w=majority';

console.log('📡 Connecting to MongoDB...');

// ✅ Direct connection - no options
mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📦 Database:', mongoose.connection.name);
})
.catch((err) => {
    console.error('❌ MongoDB Connection Failed!');
    console.error('Error:', err.message);
});

// ============================================
// 👤 USER MODEL
// ============================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ============================================
// ✅ HELPER FUNCTIONS
// ============================================
const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );
};

// ============================================
// 🏠 BASIC ROUTES
// ============================================
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🎉 SkillMint API',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        
        res.json({
            success: true,
            status: 'healthy',
            database: states[dbState],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: true,
            status: 'degraded',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// 🔐 AUTH ROUTES
// ============================================

// REGISTER
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        const token = generateToken(newUser._id, newUser.email);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = generateToken(user._id, user.email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// 🔒 PROTECTED ROUTE
// ============================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// 📚 COURSES
// ============================================
app.get('/api/courses', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: 'Web Development', price: 499 },
            { id: 2, title: 'JavaScript', price: 799 }
        ]
    });
});

// ============================================
// ❌ 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

// ============================================
// 🚀 START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('✅ SERVER STARTED');
    console.log('='.repeat(50));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log('='.repeat(50));
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    mongoose.connection.close();
    process.exit(0);
});