// src/app-simple.js
const express = require('express');
const app = express();

console.log('📦 Loading app.js...');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'SkillMint API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Test route
app.get('/test', (req, res) => {
    res.json({
        message: 'API is working!',
        success: true,
        data: {
            time: new Date().toISOString()
        }
    });
});

// API routes (simplified)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/courses', require('./routes/course.routes'));
// Add other routes as needed

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        success: false
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        success: false
    });
});

console.log('✅ app.js loaded successfully');
module.exports = app;