// server.js - CLEAN VERSION
console.log('🚀 Starting SkillMint Backend...');

require('dotenv').config();

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'SkillMint API v1.0',
        status: 'running',
        time: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!'
    });
});

// API Routes
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields required'
        });
    }
    
    res.json({
        success: true,
        message: 'User registered',
        data: {
            id: 'user_' + Date.now(),
            name,
            email
        }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password required'
        });
    }
    
    res.json({
        success: true,
        message: 'Login successful',
        token: 'jwt_token_' + Date.now(),
        user: {
            id: 'user_123',
            email,
            name: 'Test User'
        }
    });
});

app.get('/api/courses', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, title: 'Web Development', price: 499 },
            { id: 2, title: 'JavaScript', price: 799 },
            { id: 3, title: 'Node.js', price: 999 }
        ]
    });
});

app.get('/api/courses/:id', (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.params.id,
            title: 'Web Development Course',
            description: 'Learn web development',
            price: 499,
            instructor: 'John Doe'
        }
    });
});

app.post('/api/orders', (req, res) => {
    res.json({
        success: true,
        message: 'Order created',
        orderId: 'order_' + Date.now()
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ SKILLMINT BACKEND RUNNING');
    console.log('='.repeat(50));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log('='.repeat(50));
    console.log('\n📢 Endpoints:');
    console.log('   GET  /                    - Home');
    console.log('   GET  /health             - Health check');
    console.log('   POST /api/auth/register  - Register user');
    console.log('   POST /api/auth/login     - Login user');
    console.log('   GET  /api/courses        - List courses');
    console.log('   POST /api/orders         - Create order');
    console.log('\n📢 Press Ctrl+C to stop');
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    process.exit(0);
});