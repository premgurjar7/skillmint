const { body, param, query } = require('express-validator');
const { Course, User } = require('../config/db');

const courseValidation = {
    // Create course validation
    createCourse: [
        body('title')
            .trim()
            .notEmpty().withMessage('Course title is required')
            .isLength({ min: 10, max: 200 }).withMessage('Title must be between 10 and 200 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim()),
        
        body('description')
            .trim()
            .notEmpty().withMessage('Course description is required')
            .isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim()),
        
        body('shortDescription')
            .trim()
            .notEmpty().withMessage('Short description is required')
            .isLength({ max: 500 }).withMessage('Short description cannot exceed 500 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim()),
        
        body('price')
            .notEmpty().withMessage('Price is required')
            .isFloat({ min: 0, max: 100000 }).withMessage('Price must be between ₹0 and ₹100,000')
            .toFloat(),
        
        body('discountedPrice')
            .optional()
            .isFloat({ min: 0, max: 100000 }).withMessage('Discounted price must be between ₹0 and ₹100,000')
            .custom((discountedPrice, { req }) => {
                if (discountedPrice && discountedPrice >= req.body.price) {
                    throw new Error('Discounted price must be less than original price');
                }
                return true;
            })
            .toFloat(),
        
        body('category')
            .notEmpty().withMessage('Category is required')
            .isIn([
                'web-development',
                'mobile-development',
                'data-science',
                'machine-learning',
                'digital-marketing',
                'graphic-design',
                'business',
                'finance',
                'health',
                'lifestyle',
                'other'
            ]).withMessage('Invalid category'),
        
        body('level')
            .notEmpty().withMessage('Level is required')
            .isIn(['beginner', 'intermediate', 'advanced', 'all-levels'])
            .withMessage('Invalid level'),
        
        body('thumbnail')
            .notEmpty().withMessage('Course thumbnail is required')
            .isURL().withMessage('Please provide a valid thumbnail URL'),
        
        body('previewVideo')
            .optional()
            .isURL().withMessage('Please provide a valid video URL'),
        
        body('curriculum')
            .optional()
            .isArray().withMessage('Curriculum must be an array')
            .custom((curriculum) => {
                if (curriculum && curriculum.length === 0) {
                    throw new Error('Curriculum cannot be empty');
                }
                
                if (curriculum) {
                    curriculum.forEach((section, sectionIndex) => {
                        if (!section.sectionTitle || section.sectionTitle.trim() === '') {
                            throw new Error(`Section ${sectionIndex + 1}: Title is required`);
                        }
                        
                        if (!section.lectures || !Array.isArray(section.lectures)) {
                            throw new Error(`Section ${sectionIndex + 1}: Lectures must be an array`);
                        }
                        
                        if (section.lectures.length === 0) {
                            throw new Error(`Section ${sectionIndex + 1}: At least one lecture is required`);
                        }
                        
                        section.lectures.forEach((lecture, lectureIndex) => {
                            if (!lecture.title || lecture.title.trim() === '') {
                                throw new Error(`Section ${sectionIndex + 1}, Lecture ${lectureIndex + 1}: Title is required`);
                            }
                            
                            if (!lecture.duration || lecture.duration <= 0) {
                                throw new Error(`Section ${sectionIndex + 1}, Lecture ${lectureIndex + 1}: Duration must be greater than 0`);
                            }
                            
                            if (!lecture.videoUrl || lecture.videoUrl.trim() === '') {
                                throw new Error(`Section ${sectionIndex + 1}, Lecture ${lectureIndex + 1}: Video URL is required`);
                            }
                        });
                    });
                }
                
                return true;
            }),
        
        body('requirements')
            .optional()
            .isArray().withMessage('Requirements must be an array')
            .custom((requirements) => {
                if (requirements && requirements.length > 20) {
                    throw new Error('Maximum 20 requirements allowed');
                }
                return true;
            }),
        
        body('learningOutcomes')
            .optional()
            .isArray().withMessage('Learning outcomes must be an array')
            .custom((outcomes) => {
                if (outcomes && outcomes.length > 20) {
                    throw new Error('Maximum 20 learning outcomes allowed');
                }
                return true;
            }),
        
        body('tags')
            .optional()
            .isArray().withMessage('Tags must be an array')
            .custom((tags) => {
                if (tags && tags.length > 15) {
                    throw new Error('Maximum 15 tags allowed');
                }
                return true;
            }),
        
        body('affiliateCommission')
            .optional()
            .isFloat({ min: 0, max: 50 }).withMessage('Affiliate commission must be between 0% and 50%')
            .toFloat()
            .default(10),
        
        body('instructorShare')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Instructor share must be between 0% and 100%')
            .toFloat()
            .default(70),
        
        body('isPublished')
            .optional()
            .isBoolean().withMessage('isPublished must be a boolean')
            .toBoolean()
            .default(false),
        
        body('status')
            .optional()
            .isIn(['draft', 'published', 'archived']).withMessage('Invalid status')
            .default('draft'),
        
        body('metaKeywords')
            .optional()
            .isArray().withMessage('Meta keywords must be an array'),
        
        body('metaDescription')
            .optional()
            .trim()
            .isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters')
    ],

    // Update course validation
    updateCourse: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('title')
            .optional()
            .trim()
            .isLength({ min: 10, max: 200 }).withMessage('Title must be between 10 and 200 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim()),
        
        body('description')
            .optional()
            .trim()
            .isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim()),
        
        body('shortDescription')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Short description cannot exceed 500 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim()),
        
        body('price')
            .optional()
            .isFloat({ min: 0, max: 100000 }).withMessage('Price must be between ₹0 and ₹100,000')
            .toFloat(),
        
        body('discountedPrice')
            .optional()
            .isFloat({ min: 0, max: 100000 }).withMessage('Discounted price must be between ₹0 and ₹100,000')
            .custom((discountedPrice, { req }) => {
                const price = req.body.price || req.course?.price;
                if (discountedPrice && price && discountedPrice >= price) {
                    throw new Error('Discounted price must be less than original price');
                }
                return true;
            })
            .toFloat(),
        
        body('category')
            .optional()
            .isIn([
                'web-development',
                'mobile-development',
                'data-science',
                'machine-learning',
                'digital-marketing',
                'graphic-design',
                'business',
                'finance',
                'health',
                'lifestyle',
                'other'
            ]).withMessage('Invalid category'),
        
        body('level')
            .optional()
            .isIn(['beginner', 'intermediate', 'advanced', 'all-levels'])
            .withMessage('Invalid level'),
        
        body('thumbnail')
            .optional()
            .isURL().withMessage('Please provide a valid thumbnail URL'),
        
        body('previewVideo')
            .optional()
            .isURL().withMessage('Please provide a valid video URL'),
        
        body('curriculum')
            .optional()
            .isArray().withMessage('Curriculum must be an array')
            .custom((curriculum) => {
                if (curriculum && curriculum.length === 0) {
                    throw new Error('Curriculum cannot be empty');
                }
                
                if (curriculum) {
                    curriculum.forEach((section, sectionIndex) => {
                        if (!section.sectionTitle || section.sectionTitle.trim() === '') {
                            throw new Error(`Section ${sectionIndex + 1}: Title is required`);
                        }
                        
                        if (!section.lectures || !Array.isArray(section.lectures)) {
                            throw new Error(`Section ${sectionIndex + 1}: Lectures must be an array`);
                        }
                        
                        section.lectures.forEach((lecture, lectureIndex) => {
                            if (!lecture.title || lecture.title.trim() === '') {
                                throw new Error(`Section ${sectionIndex + 1}, Lecture ${lectureIndex + 1}: Title is required`);
                            }
                            
                            if (!lecture.duration || lecture.duration <= 0) {
                                throw new Error(`Section ${sectionIndex + 1}, Lecture ${lectureIndex + 1}: Duration must be greater than 0`);
                            }
                            
                            if (!lecture.videoUrl || lecture.videoUrl.trim() === '') {
                                throw new Error(`Section ${sectionIndex + 1}, Lecture ${lectureIndex + 1}: Video URL is required`);
                            }
                        });
                    });
                }
                
                return true;
            }),
        
        body('requirements')
            .optional()
            .isArray().withMessage('Requirements must be an array')
            .custom((requirements) => {
                if (requirements && requirements.length > 20) {
                    throw new Error('Maximum 20 requirements allowed');
                }
                return true;
            }),
        
        body('learningOutcomes')
            .optional()
            .isArray().withMessage('Learning outcomes must be an array')
            .custom((outcomes) => {
                if (outcomes && outcomes.length > 20) {
                    throw new Error('Maximum 20 learning outcomes allowed');
                }
                return true;
            }),
        
        body('tags')
            .optional()
            .isArray().withMessage('Tags must be an array')
            .custom((tags) => {
                if (tags && tags.length > 15) {
                    throw new Error('Maximum 15 tags allowed');
                }
                return true;
            }),
        
        body('affiliateCommission')
            .optional()
            .isFloat({ min: 0, max: 50 }).withMessage('Affiliate commission must be between 0% and 50%')
            .toFloat(),
        
        body('instructorShare')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Instructor share must be between 0% and 100%')
            .toFloat(),
        
        body('isPublished')
            .optional()
            .isBoolean().withMessage('isPublished must be a boolean')
            .toBoolean(),
        
        body('status')
            .optional()
            .isIn(['draft', 'published', 'archived', 'rejected']).withMessage('Invalid status'),
        
        body('isFeatured')
            .optional()
            .isBoolean().withMessage('isFeatured must be a boolean')
            .toBoolean()
    ],

    // Publish course validation
    publishCourse: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID')
            .custom(async (courseId, { req }) => {
                const course = await Course.findById(courseId);
                if (!course) {
                    throw new Error('Course not found');
                }
                
                // Check if course meets publishing requirements
                if (!course.thumbnail) {
                    throw new Error('Course thumbnail is required');
                }
                
                if (!course.curriculum || course.curriculum.length === 0) {
                    throw new Error('Course curriculum is required');
                }
                
                if (course.totalDuration < 30) { // At least 30 minutes
                    throw new Error('Course must have at least 30 minutes of content');
                }
                
                req.course = course;
                return true;
            })
    ],

    // Search courses validation
    searchCourses: [
        query('q')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
        
        query('category')
            .optional()
            .isIn([
                'web-development',
                'mobile-development',
                'data-science',
                'machine-learning',
                'digital-marketing',
                'graphic-design',
                'business',
                'finance',
                'health',
                'lifestyle',
                'other'
            ]).withMessage('Invalid category'),
        
        query('level')
            .optional()
            .isIn(['beginner', 'intermediate', 'advanced', 'all-levels'])
            .withMessage('Invalid level'),
        
        query('minPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number')
            .toFloat(),
        
        query('maxPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number')
            .toFloat()
            .custom((maxPrice, { req }) => {
                if (req.query.minPrice && maxPrice && maxPrice < req.query.minPrice) {
                    throw new Error('Maximum price must be greater than minimum price');
                }
                return true;
            }),
        
        query('rating')
            .optional()
            .isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5')
            .toFloat(),
        
        query('instructor')
            .optional()
            .isMongoId().withMessage('Invalid instructor ID'),
        
        query('isFeatured')
            .optional()
            .isBoolean().withMessage('isFeatured must be a boolean')
            .toBoolean(),
        
        query('isPublished')
            .optional()
            .isBoolean().withMessage('isPublished must be a boolean')
            .toBoolean()
            .default(true),
        
        query('sortBy')
            .optional()
            .isIn(['price', 'rating', 'createdAt', 'updatedAt', 'popularity', 'totalEnrollments'])
            .withMessage('Invalid sort field'),
        
        query('sortOrder')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
            .default('desc'),
        
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt()
            .default(1),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt()
            .default(10)
    ],

    // Add review validation
    addReview: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID')
            .custom(async (courseId, { req }) => {
                const course = await Course.findById(courseId);
                if (!course) {
                    throw new Error('Course not found');
                }
                
                // Check if user is enrolled
                const { Order } = require('../config/db');
                const enrollment = await Order.findOne({
                    user: req.user._id,
                    course: courseId,
                    paymentStatus: 'completed'
                });
                
                if (!enrollment) {
                    throw new Error('You must enroll in the course before reviewing');
                }
                
                // Check if user already reviewed
                // Assuming Course model has reviews array
                // if (course.reviews && course.reviews.some(r => r.user.toString() === req.user._id.toString())) {
                //     throw new Error('You have already reviewed this course');
                // }
                
                req.course = course;
                return true;
            }),
        
        body('rating')
            .notEmpty().withMessage('Rating is required')
            .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
            .toFloat(),
        
        body('comment')
            .optional()
            .trim()
            .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
            .customSanitizer(value => value.replace(/\s+/g, ' ').trim())
    ],

    // Create quiz/assessment validation
    createAssessment: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('title')
            .trim()
            .notEmpty().withMessage('Assessment title is required')
            .isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
        
        body('description')
            .optional()
            .trim()
            .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
        
        body('questions')
            .notEmpty().withMessage('Questions are required')
            .isArray({ min: 1 }).withMessage('At least one question is required')
            .custom((questions) => {
                if (questions.length > 50) {
                    throw new Error('Maximum 50 questions allowed');
                }
                
                questions.forEach((question, index) => {
                    if (!question.text || question.text.trim() === '') {
                        throw new Error(`Question ${index + 1}: Text is required`);
                    }
                    
                    if (!question.options || !Array.isArray(question.options)) {
                        throw new Error(`Question ${index + 1}: Options must be an array`);
                    }
                    
                    if (question.options.length < 2 || question.options.length > 5) {
                        throw new Error(`Question ${index + 1}: Must have 2 to 5 options`);
                    }
                    
                    if (!question.correctAnswer && question.correctAnswer !== 0) {
                        throw new Error(`Question ${index + 1}: Correct answer is required`);
                    }
                    
                    if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
                        throw new Error(`Question ${index + 1}: Invalid correct answer index`);
                    }
                });
                
                return true;
            }),
        
        body('passingScore')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Passing score must be between 0 and 100')
            .toInt()
            .default(70),
        
        body('timeLimit')
            .optional()
            .isInt({ min: 1, max: 180 }).withMessage('Time limit must be between 1 and 180 minutes')
            .toInt(),
        
        body('isPublished')
            .optional()
            .isBoolean().withMessage('isPublished must be a boolean')
            .toBoolean()
            .default(false)
    ],

    // Update course status (admin)
    updateCourseStatus: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['published', 'rejected', 'archived']).withMessage('Invalid status'),
        
        body('adminNotes')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Admin notes cannot exceed 500 characters')
    ],

    // Feature course (admin)
    featureCourse: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('isFeatured')
            .notEmpty().withMessage('isFeatured is required')
            .isBoolean().withMessage('isFeatured must be a boolean')
            .toBoolean(),
        
        body('featuredUntil')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .custom((date) => {
                if (new Date(date) <= new Date()) {
                    throw new Error('Featured until date must be in the future');
                }
                return true;
            })
    ],

    // Get course analytics
    getAnalytics: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        query('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date format'),
        
        query('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date format')
            .custom((endDate, { req }) => {
                if (req.query.startDate && endDate && new Date(endDate) < new Date(req.query.startDate)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            }),
        
        query('groupBy')
            .optional()
            .isIn(['day', 'week', 'month', 'year']).withMessage('Group by must be day, week, month, or year')
    ],

    // Bulk course operations
    bulkUpdate: [
        body('courseIds')
            .notEmpty().withMessage('Course IDs are required')
            .isArray({ min: 1 }).withMessage('At least one course ID is required')
            .custom((courseIds) => {
                if (courseIds.length > 50) {
                    throw new Error('Maximum 50 courses allowed for bulk operation');
                }
                
                courseIds.forEach(id => {
                    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                        throw new Error(`Invalid course ID: ${id}`);
                    }
                });
                
                return true;
            }),
        
        body('updates')
            .notEmpty().withMessage('Updates are required')
            .isObject().withMessage('Updates must be an object')
    ],

    // Validate course access
    validateAccess: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID')
            .custom(async (courseId, { req }) => {
                const course = await Course.findById(courseId);
                if (!course) {
                    throw new Error('Course not found');
                }
                
                // Check if user has access
                if (req.user.role === 'admin') {
                    req.course = course;
                    return true;
                }
                
                if (req.user.role === 'instructor' && course.instructor.toString() === req.user._id.toString()) {
                    req.course = course;
                    return true;
                }
                
                // Check if student is enrolled
                const { Order } = require('../config/db');
                const enrollment = await Order.findOne({
                    user: req.user._id,
                    course: courseId,
                    paymentStatus: 'completed'
                });
                
                if (!enrollment) {
                    throw new Error('You do not have access to this course');
                }
                
                req.course = course;
                return true;
            })
    ],

    // Course completion validation
    markComplete: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID'),
        
        body('lectureId')
            .optional()
            .isMongoId().withMessage('Invalid lecture ID'),
        
        body('sectionId')
            .optional()
            .isMongoId().withMessage('Invalid section ID'),
        
        body('isCompleted')
            .optional()
            .isBoolean().withMessage('isCompleted must be a boolean')
            .toBoolean()
    ],

    // Get course progress
    getProgress: [
        param('id')
            .notEmpty().withMessage('Course ID is required')
            .isMongoId().withMessage('Invalid course ID')
    ],

    // Course statistics
    getStatistics: [
        query('instructorId')
            .optional()
            .isMongoId().withMessage('Invalid instructor ID'),
        
        query('startDate')
            .optional()
            .isISO8601().withMessage('Invalid start date format'),
        
        query('endDate')
            .optional()
            .isISO8601().withMessage('Invalid end date format'),
        
        query('groupBy')
            .optional()
            .isIn(['day', 'week', 'month', 'year']).withMessage('Invalid group by value')
    ]
};

module.exports = courseValidation;