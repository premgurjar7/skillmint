// server.js - WITH COURSE ENROLLMENT
console.log('🚀 Starting SkillMint Backend...');

require('dotenv').config();

const express = require('express');
const cors = require('cors'); // CORS package add kiya
const app = express();

// ========== MIDDLEWARE ==========
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== BASIC ROUTES ==========
app.get('/', (req, res) => {
    res.json({
        message: 'SkillMint API v2.0',
        status: 'running',
        time: new Date().toISOString(),
        features: ['Authentication', 'Courses', 'Enrollment', 'Orders']
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        version: '2.0'
    });
});

// ========== AUTHENTICATION ==========
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields required'
        });
    }
    
    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            id: 'user_' + Date.now(),
            name,
            email,
            role: 'student',
            createdAt: new Date().toISOString()
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
            name: 'Test User',
            role: 'student',
            walletBalance: 1500
        }
    });
});

// ========== COURSES ==========
app.get('/api/courses', (req, res) => {
    res.json({
        success: true,
        message: 'Courses retrieved',
        data: [
            {
                id: 'course_1',
                title: 'Web Development Bootcamp',
                description: 'Learn full stack web development',
                instructor: 'John Doe',
                price: 4999,
                rating: 4.5,
                students: 1250,
                duration: '40 hours',
                category: 'Web Development',
                thumbnail: 'https://picsum.photos/400/300?random=1'
            },
            {
                id: 'course_2',
                title: 'JavaScript Mastery',
                description: 'Advanced JavaScript concepts',
                instructor: 'Jane Smith',
                price: 2999,
                rating: 4.8,
                students: 890,
                duration: '30 hours',
                category: 'Programming',
                thumbnail: 'https://picsum.photos/400/300?random=2'
            },
            {
                id: 'course_3',
                title: 'React.js Frontend Development',
                description: 'Build modern web apps with React',
                instructor: 'Alex Johnson',
                price: 3999,
                rating: 4.7,
                students: 1540,
                duration: '35 hours',
                category: 'Frontend',
                thumbnail: 'https://picsum.photos/400/300?random=3'
            },
            {
                id: 'course_4',
                title: 'Node.js Backend Mastery',
                description: 'Build REST APIs with Node.js',
                instructor: 'Sarah Williams',
                price: 4499,
                rating: 4.6,
                students: 2100,
                duration: '45 hours',
                category: 'Backend',
                thumbnail: 'https://picsum.photos/400/300?random=4'
            }
        ]
    });
});

app.get('/api/courses/:id', (req, res) => {
    const courseId = req.params.id;
    
    res.json({
        success: true,
        message: 'Course details retrieved',
        data: {
            id: courseId,
            title: 'Web Development Bootcamp',
            description: 'Complete full-stack web development course covering HTML, CSS, JavaScript, React, Node.js, Express, and MongoDB. Perfect for beginners to advanced developers.',
            instructor: {
                id: 'instr_001',
                name: 'John Doe',
                rating: 4.9,
                totalStudents: 10000,
                experience: '5+ years'
            },
            price: 4999,
            rating: 4.5,
            totalRatings: 1250,
            studentsEnrolled: 1250,
            duration: '40 hours',
            category: 'Web Development',
            modules: [
                {
                    id: 'module_1',
                    title: 'HTML & CSS Fundamentals',
                    duration: '8 hours',
                    lessons: 15,
                    completed: false
                },
                {
                    id: 'module_2',
                    title: 'JavaScript Basics',
                    duration: '10 hours',
                    lessons: 20,
                    completed: false
                },
                {
                    id: 'module_3',
                    title: 'Advanced JavaScript',
                    duration: '6 hours',
                    lessons: 12,
                    completed: false
                },
                {
                    id: 'module_4',
                    title: 'React.js',
                    duration: '8 hours',
                    lessons: 18,
                    completed: false
                },
                {
                    id: 'module_5',
                    title: 'Node.js & Express',
                    duration: '8 hours',
                    lessons: 16,
                    completed: false
                }
            ],
            requirements: [
                'Basic computer knowledge',
                'Internet connection',
                'Code editor (VS Code recommended)'
            ],
            whatYouLearn: [
                'Build responsive websites',
                'Create REST APIs',
                'Database design with MongoDB',
                'Deploy applications to cloud',
                'Git version control'
            ]
        }
    });
});

// ========== COURSE ENROLLMENT ==========
app.post('/api/courses/enroll', (req, res) => {
    try {
        const { courseId } = req.body;
        
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Successfully enrolled in course',
            data: {
                enrollmentId: 'enroll_' + Date.now(),
                courseId,
                userId: 'user_123',
                enrolledAt: new Date().toISOString(),
                status: 'active',
                progress: 0,
                paymentStatus: 'paid',
                accessExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Enrollment failed'
        });
    }
});

app.get('/api/courses/enrolled', (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Enrolled courses retrieved',
            data: [
                {
                    enrollmentId: 'enroll_123',
                    courseId: 'course_1',
                    title: 'Web Development Bootcamp',
                    instructor: 'John Doe',
                    thumbnail: 'https://picsum.photos/200/150?random=1',
                    enrolledAt: '2024-02-01T10:30:00Z',
                    progress: 65,
                    lastAccessed: '2024-02-03T09:15:00Z',
                    status: 'active',
                    completionDate: null
                },
                {
                    enrollmentId: 'enroll_124',
                    courseId: 'course_2',
                    title: 'JavaScript Mastery',
                    instructor: 'Jane Smith',
                    thumbnail: 'https://picsum.photos/200/150?random=2',
                    enrolledAt: '2024-01-15T14:20:00Z',
                    progress: 100,
                    lastAccessed: '2024-01-30T11:45:00Z',
                    status: 'completed',
                    completionDate: '2024-01-30T11:45:00Z'
                },
                {
                    enrollmentId: 'enroll_125',
                    courseId: 'course_3',
                    title: 'React.js Frontend Development',
                    instructor: 'Alex Johnson',
                    thumbnail: 'https://picsum.photos/200/150?random=3',
                    enrolledAt: '2024-01-20T09:10:00Z',
                    progress: 30,
                    lastAccessed: '2024-02-02T16:30:00Z',
                    status: 'active',
                    completionDate: null
                }
            ]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get enrolled courses'
        });
    }
});

app.get('/api/courses/:courseId/content', (req, res) => {
    try {
        const { courseId } = req.params;
        
        res.json({
            success: true,
            message: 'Course content retrieved',
            data: {
                courseId,
                title: 'Web Development Bootcamp',
                description: 'Learn full stack web development from scratch',
                instructor: {
                    name: 'John Doe',
                    expertise: 'Full Stack Developer',
                    rating: 4.8,
                    students: 10000
                },
                modules: [
                    {
                        moduleId: 'module_1',
                        title: 'HTML & CSS Fundamentals',
                        order: 1,
                        duration: '8 hours',
                        videos: [
                            {
                                videoId: 'video_1',
                                title: 'Introduction to HTML',
                                duration: '15:30',
                                url: 'https://example.com/videos/html-intro.mp4',
                                thumbnail: 'https://picsum.photos/320/180?random=1',
                                description: 'Learn the basics of HTML structure',
                                completed: true,
                                watchedDuration: 930
                            },
                            {
                                videoId: 'video_2',
                                title: 'CSS Basics and Styling',
                                duration: '22:15',
                                url: 'https://example.com/videos/css-basics.mp4',
                                thumbnail: 'https://picsum.photos/320/180?random=2',
                                description: 'Learn how to style your web pages',
                                completed: false,
                                watchedDuration: 0
                            },
                            {
                                videoId: 'video_3',
                                title: 'Responsive Web Design',
                                duration: '18:45',
                                url: 'https://example.com/videos/responsive-design.mp4',
                                thumbnail: 'https://picsum.photos/320/180?random=3',
                                description: 'Make websites work on all devices',
                                completed: false,
                                watchedDuration: 0
                            }
                        ],
                        resources: [
                            {
                                id: 'resource_1',
                                title: 'HTML Cheatsheet PDF',
                                type: 'pdf',
                                url: 'https://example.com/resources/html-cheatsheet.pdf',
                                size: '2.4 MB'
                            },
                            {
                                id: 'resource_2',
                                title: 'CSS Flexbox Guide',
                                type: 'pdf',
                                url: 'https://example.com/resources/flexbox-guide.pdf',
                                size: '1.8 MB'
                            }
                        ],
                        quiz: {
                            id: 'quiz_1',
                            title: 'HTML & CSS Quiz',
                            questions: 10,
                            passingScore: 7,
                            completed: true,
                            score: 8
                        }
                    },
                    {
                        moduleId: 'module_2',
                        title: 'JavaScript Basics',
                        order: 2,
                        duration: '10 hours',
                        videos: [
                            {
                                videoId: 'video_4',
                                title: 'JavaScript Variables and Data Types',
                                duration: '20:10',
                                url: 'https://example.com/videos/js-variables.mp4',
                                thumbnail: 'https://picsum.photos/320/180?random=4',
                                description: 'Learn about variables and data types',
                                completed: false,
                                watchedDuration: 0
                            }
                        ],
                        resources: [
                            {
                                id: 'resource_3',
                                title: 'JavaScript Exercises',
                                type: 'zip',
                                url: 'https://example.com/resources/js-exercises.zip',
                                size: '5.2 MB'
                            }
                        ]
                    }
                ],
                progress: {
                    totalModules: 10,
                    completedModules: 1,
                    totalVideos: 50,
                    watchedVideos: 1,
                    totalQuizzes: 8,
                    completedQuizzes: 1,
                    overallProgress: 10
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get course content'
        });
    }
});

app.post('/api/courses/:courseId/complete-video', (req, res) => {
    try {
        const { courseId } = req.params;
        const { videoId, watchedDuration } = req.body;
        
        res.json({
            success: true,
            message: 'Video marked as completed',
            data: {
                videoId,
                courseId,
                completedAt: new Date().toISOString(),
                watchedDuration: watchedDuration || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark video'
        });
    }
});

app.get('/api/courses/:courseId/progress', (req, res) => {
    try {
        const { courseId } = req.params;
        
        res.json({
            success: true,
            message: 'Course progress retrieved',
            data: {
                courseId,
                progress: 65,
                modulesCompleted: 6,
                totalModules: 10,
                videosWatched: 32,
                totalVideos: 50,
                quizzesCompleted: 4,
                totalQuizzes: 8,
                timeSpent: '15 hours 30 minutes',
                lastActivity: '2024-02-03T09:15:00Z',
                estimatedCompletion: '2024-03-15T00:00:00Z'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get progress'
        });
    }
});

// ========== ORDERS ==========
app.post('/api/orders', (req, res) => {
    const { courseId, paymentMethod = 'razorpay' } = req.body;
    
    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: 'Course ID is required'
        });
    }
    
    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
            orderId: 'order_' + Date.now(),
            courseId,
            amount: 4999,
            status: 'pending',
            paymentMethod,
            createdAt: new Date().toISOString(),
            razorpayOrderId: 'rzp_order_' + Date.now()
        }
    });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('          ✅ SKILLMINT BACKEND v2.0 RUNNING');
    console.log('='.repeat(60));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log('='.repeat(60));
    console.log('\n📢 NEW ENROLLMENT ENDPOINTS:');
    console.log('   POST /api/courses/enroll           - Enroll in course');
    console.log('   GET  /api/courses/enrolled        - Get enrolled courses');
    console.log('   GET  /api/courses/:id/content     - Get course content');
    console.log('   POST /api/courses/:id/complete-video - Mark video complete');
    console.log('   GET  /api/courses/:id/progress    - Get course progress');
    console.log('\n📢 BASIC ENDPOINTS:');
    console.log('   GET  /                           - Home');
    console.log('   GET  /health                     - Health check');
    console.log('   POST /api/auth/register          - Register user');
    console.log('   POST /api/auth/login             - Login user');
    console.log('   GET  /api/courses                - List courses');
    console.log('   GET  /api/courses/:id           - Course details');
    console.log('   POST /api/orders                - Create order');
    console.log('\n📢 Press Ctrl+C to stop');
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    process.exit(0);
});