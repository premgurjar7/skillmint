const express = require('express');
const router = express.Router();
const CourseService = require('../services/course.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { isInstructorOrAdmin, canManageCourse, canViewCourse } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const courseValidation = require('../validations/course.validation');
const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// @route   GET /api/courses
// @desc    Get all courses (with filters)
// @access  Public
router.get(
    '/',
    validate(courseValidation.searchCourses),
    async (req, res) => {
        try {
            const filters = {
                search: req.query.q,
                category: req.query.category,
                level: req.query.level,
                minPrice: req.query.minPrice,
                maxPrice: req.query.maxPrice,
                rating: req.query.rating,
                instructor: req.query.instructor,
                isFeatured: req.query.isFeatured,
                isPublished: req.query.isPublished
            };
            
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || '-createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            
            const result = await CourseService.getAllCourses(filters, pagination);
            ResponseHandler.sendPaginated(res, 'Courses retrieved successfully', result.courses, result.pagination);
        } catch (error) {
            logger.error(`Get courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
router.get(
    '/:id',
    validate(courseValidation.validateAccess),
    canViewCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const course = await CourseService.getCourseById(id, req.user);
            
            ResponseHandler.sendSuccess(res, 'Course retrieved successfully', course);
        } catch (error) {
            logger.error(`Get course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses
// @desc    Create new course
// @access  Private/Instructor/Admin
router.post(
    '/',
    authenticate,
    isInstructorOrAdmin,
    validate(courseValidation.createCourse),
    async (req, res) => {
        try {
            const courseData = {
                ...req.body,
                instructor: req.user._id
            };
            
            const course = await CourseService.createCourse(courseData);
            ResponseHandler.sendCreated(res, 'Course created successfully', course);
        } catch (error) {
            logger.error(`Create course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private/Instructor/Admin
router.put(
    '/:id',
    authenticate,
    isInstructorOrAdmin,
    validate(courseValidation.updateCourse),
    canManageCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const course = await CourseService.updateCourse(id, req.body, req.user);
            
            ResponseHandler.sendSuccess(res, 'Course updated successfully', course);
        } catch (error) {
            logger.error(`Update course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private/Instructor/Admin
router.delete(
    '/:id',
    authenticate,
    isInstructorOrAdmin,
    canManageCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            await CourseService.deleteCourse(id);
            
            ResponseHandler.sendSuccess(res, 'Course deleted successfully');
        } catch (error) {
            logger.error(`Delete course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/publish
// @desc    Publish course
// @access  Private/Instructor/Admin
router.post(
    '/:id/publish',
    authenticate,
    isInstructorOrAdmin,
    validate(courseValidation.publishCourse),
    canManageCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const course = await CourseService.publishCourse(id);
            
            ResponseHandler.sendSuccess(res, 'Course published successfully', course);
        } catch (error) {
            logger.error(`Publish course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/unpublish
// @desc    Unpublish course
// @access  Private/Instructor/Admin
router.post(
    '/:id/unpublish',
    authenticate,
    isInstructorOrAdmin,
    canManageCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const course = await CourseService.unpublishCourse(id);
            
            ResponseHandler.sendSuccess(res, 'Course unpublished successfully', course);
        } catch (error) {
            logger.error(`Unpublish course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in course
// @access  Private
router.post(
    '/:id/enroll',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { referralCode, couponCode } = req.body;
            
            const PaymentService = require('../services/payment.service');
            
            // Create order for enrollment
            const orderData = {
                userId: req.user._id,
                courseId: id,
                referralCode,
                couponCode,
                userName: req.user.name,
                userEmail: req.user.email,
                userPhone: req.user.phone,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                device: req.headers['device'] || 'web'
            };
            
            // For now, create Razorpay order
            // In real implementation, you might have different payment flows
            const result = await PaymentService.createRazorpayOrder(orderData);
            
            ResponseHandler.sendSuccess(res, 'Enrollment initiated', result);
        } catch (error) {
            logger.error(`Enroll in course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/:id/content
// @desc    Get course content (for enrolled users)
// @access  Private
router.get(
    '/:id/content',
    authenticate,
    canViewCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const content = await CourseService.getCourseContent(id, req.user._id);
            
            ResponseHandler.sendSuccess(res, 'Course content retrieved', content);
        } catch (error) {
            logger.error(`Get course content error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/progress
// @desc    Update course progress
// @access  Private
router.post(
    '/:id/progress',
    authenticate,
    validate(courseValidation.markComplete),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { lectureId, sectionId, isCompleted } = req.body;
            
            const result = await CourseService.updateProgress(
                id,
                req.user._id,
                { lectureId, sectionId, isCompleted }
            );
            
            ResponseHandler.sendSuccess(res, 'Progress updated', result);
        } catch (error) {
            logger.error(`Update progress error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/:id/progress
// @desc    Get course progress
// @access  Private
router.get(
    '/:id/progress',
    authenticate,
    validate(courseValidation.getProgress),
    async (req, res) => {
        try {
            const { id } = req.params;
            const progress = await CourseService.getProgress(id, req.user._id);
            
            ResponseHandler.sendSuccess(res, 'Progress retrieved', progress);
        } catch (error) {
            logger.error(`Get progress error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/reviews
// @desc    Add review to course
// @access  Private/Enrolled Students
router.post(
    '/:id/reviews',
    authenticate,
    validate(courseValidation.addReview),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { rating, comment } = req.body;
            
            const review = await CourseService.addReview(
                id,
                req.user._id,
                { rating, comment }
            );
            
            ResponseHandler.sendCreated(res, 'Review added successfully', review);
        } catch (error) {
            logger.error(`Add review error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/:id/reviews
// @desc    Get course reviews
// @access  Public
router.get(
    '/:id/reviews',
    async (req, res) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10 } = req.query;
            
            const reviews = await CourseService.getCourseReviews(
                id,
                parseInt(page),
                parseInt(limit)
            );
            
            ResponseHandler.sendPaginated(res, 'Reviews retrieved', reviews.data, reviews.pagination);
        } catch (error) {
            logger.error(`Get reviews error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/:id/students
// @desc    Get enrolled students (for instructor/admin)
// @access  Private/Instructor/Admin
router.get(
    '/:id/students',
    authenticate,
    isInstructorOrAdmin,
    canManageCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;
            
            const students = await CourseService.getEnrolledStudents(
                id,
                parseInt(page),
                parseInt(limit)
            );
            
            ResponseHandler.sendPaginated(res, 'Enrolled students retrieved', students.data, students.pagination);
        } catch (error) {
            logger.error(`Get enrolled students error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/:id/analytics
// @desc    Get course analytics
// @access  Private/Instructor/Admin
router.get(
    '/:id/analytics',
    authenticate,
    isInstructorOrAdmin,
    validate(courseValidation.getAnalytics),
    canManageCourse,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { startDate, endDate, groupBy } = req.query;
            
            const analytics = await CourseService.getCourseAnalytics(
                id,
                { startDate, endDate, groupBy }
            );
            
            ResponseHandler.sendSuccess(res, 'Course analytics retrieved', analytics);
        } catch (error) {
            logger.error(`Get course analytics error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/categories
// @desc    Get all course categories
// @access  Public
router.get(
    '/categories',
    async (req, res) => {
        try {
            const categories = await CourseService.getCategories();
            ResponseHandler.sendSuccess(res, 'Categories retrieved', categories);
        } catch (error) {
            logger.error(`Get categories error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/instructors/:id/courses
// @desc    Get courses by instructor
// @access  Public
router.get(
    '/instructors/:id/courses',
    async (req, res) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, isPublished = true } = req.query;
            
            const courses = await CourseService.getCoursesByInstructor(
                id,
                parseInt(page),
                parseInt(limit),
                isPublished === 'true'
            );
            
            ResponseHandler.sendPaginated(res, 'Instructor courses retrieved', courses.data, courses.pagination);
        } catch (error) {
            logger.error(`Get instructor courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/popular
// @desc    Get popular courses
// @access  Public
router.get(
    '/popular',
    async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const courses = await CourseService.getPopularCourses(parseInt(limit));
            
            ResponseHandler.sendSuccess(res, 'Popular courses retrieved', courses);
        } catch (error) {
            logger.error(`Get popular courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/featured
// @desc    Get featured courses
// @access  Public
router.get(
    '/featured',
    async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const courses = await CourseService.getFeaturedCourses(parseInt(limit));
            
            ResponseHandler.sendSuccess(res, 'Featured courses retrieved', courses);
        } catch (error) {
            logger.error(`Get featured courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/new
// @desc    Get new courses
// @access  Public
router.get(
    '/new',
    async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const courses = await CourseService.getNewCourses(parseInt(limit));
            
            ResponseHandler.sendSuccess(res, 'New courses retrieved', courses);
        } catch (error) {
            logger.error(`Get new courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/feature
// @desc    Feature/unfeature course (Admin only)
// @access  Private/Admin
router.post(
    '/:id/feature',
    authenticate,
    authorize('admin'),
    validate(courseValidation.featureCourse),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { isFeatured, featuredUntil } = req.body;
            
            const course = await CourseService.featureCourse(
                id,
                isFeatured,
                featuredUntil
            );
            
            ResponseHandler.sendSuccess(res, 
                isFeatured ? 'Course featured' : 'Course unfeatured', 
                course
            );
        } catch (error) {
            logger.error(`Feature course error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   PUT /api/courses/:id/status
// @desc    Update course status (Admin only)
// @access  Private/Admin
router.put(
    '/:id/status',
    authenticate,
    authorize('admin'),
    validate(courseValidation.updateCourseStatus),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status, adminNotes } = req.body;
            
            const course = await CourseService.updateCourseStatus(
                id,
                status,
                adminNotes,
                req.user._id
            );
            
            ResponseHandler.sendSuccess(res, 'Course status updated', course);
        } catch (error) {
            logger.error(`Update course status error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/stats/overview
// @desc    Get courses overview statistics
// @access  Private/Admin
router.get(
    '/stats/overview',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const stats = await CourseService.getCoursesOverviewStats();
            ResponseHandler.sendSuccess(res, 'Courses overview stats', stats);
        } catch (error) {
            logger.error(`Get courses overview stats error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/bulk-update
// @desc    Bulk update courses (Admin only)
// @access  Private/Admin
router.post(
    '/bulk-update',
    authenticate,
    authorize('admin'),
    validate(courseValidation.bulkUpdate),
    async (req, res) => {
        try {
            const { courseIds, updates } = req.body;
            
            const result = await CourseService.bulkUpdateCourses(
                courseIds,
                updates,
                req.user._id
            );
            
            ResponseHandler.sendSuccess(res, 'Courses bulk updated', result);
        } catch (error) {
            logger.error(`Bulk update courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/my-courses
// @desc    Get user's enrolled courses
// @access  Private
router.get(
    '/my-courses',
    authenticate,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const courses = await CourseService.getUserCourses(
                req.user._id,
                parseInt(page),
                parseInt(limit),
                status
            );
            
            ResponseHandler.sendPaginated(res, 'My courses retrieved', courses.data, courses.pagination);
        } catch (error) {
            logger.error(`Get my courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/instructor/courses
// @desc    Get instructor's courses
// @access  Private/Instructor
router.get(
    '/instructor/courses',
    authenticate,
    authorize('instructor', 'admin'),
    async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const courses = await CourseService.getInstructorCourses(
                req.user._id,
                parseInt(page),
                parseInt(limit),
                status
            );
            
            ResponseHandler.sendPaginated(res, 'Instructor courses retrieved', courses.data, courses.pagination);
        } catch (error) {
            logger.error(`Get instructor courses error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   POST /api/courses/:id/complete
// @desc    Mark course as completed
// @access  Private
router.post(
    '/:id/complete',
    authenticate,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await CourseService.markCourseComplete(
                id,
                req.user._id
            );
            
            ResponseHandler.sendSuccess(res, 'Course marked as completed', result);
        } catch (error) {
            logger.error(`Mark course complete error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

// @route   GET /api/courses/search/suggestions
// @desc    Search course suggestions
// @access  Public
router.get(
    '/search/suggestions',
    async (req, res) => {
        try {
            const { q, limit = 10 } = req.query;
            
            if (!q || q.length < 2) {
                return ResponseHandler.sendSuccess(res, 'Suggestions', []);
            }
            
            const suggestions = await CourseService.searchSuggestions(q, parseInt(limit));
            ResponseHandler.sendSuccess(res, 'Course suggestions', suggestions);
        } catch (error) {
            logger.error(`Course search suggestions error: ${error.message}`);
            ResponseHandler.sendError(res, error.message);
        }
    }
);

module.exports = router;