const CourseService = require('../services/course.service');
const { ResponseHandler } = require('../utils/responseHandler');

// Get all courses
exports.getAllCourses = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, category, instructorId, status, sortBy } = req.query;
        const filters = { search, category, instructorId, status };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await CourseService.getAllCourses(filters, pagination, sortBy);
        ResponseHandler.sendPaginated(res, 'Courses retrieved', result.courses, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await CourseService.getCourseById(id);
        
        ResponseHandler.sendSuccess(res, 'Course retrieved', course);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Create new course
exports.createCourse = async (req, res) => {
    try {
        const instructorId = req.user._id;
        const courseData = req.body;
        
        const course = await CourseService.createCourse(instructorId, courseData);
        ResponseHandler.sendCreated(res, 'Course created successfully', course);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update course
exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const instructorId = req.user._id;
        const courseData = req.body;
        
        const course = await CourseService.updateCourse(id, instructorId, courseData);
        ResponseHandler.sendSuccess(res, 'Course updated successfully', course);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Delete course
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const instructorId = req.user._id;
        
        await CourseService.deleteCourse(id, instructorId);
        ResponseHandler.sendSuccess(res, 'Course deleted successfully');
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Enroll in course
exports.enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user._id;
        
        const enrollment = await CourseService.enrollInCourse(courseId, userId);
        ResponseHandler.sendSuccess(res, 'Enrolled in course successfully', enrollment);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get enrolled courses
exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await CourseService.getEnrolledCourses(userId, pagination);
        ResponseHandler.sendPaginated(res, 'Enrolled courses retrieved', result.courses, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get course content
exports.getCourseContent = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;
        
        const content = await CourseService.getCourseContent(courseId, userId);
        ResponseHandler.sendSuccess(res, 'Course content retrieved', content);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Add course content
exports.addCourseContent = async (req, res) => {
    try {
        const { courseId } = req.params;
        const instructorId = req.user._id;
        const contentData = req.body;
        
        const content = await CourseService.addCourseContent(courseId, instructorId, contentData);
        ResponseHandler.sendSuccess(res, 'Content added successfully', content);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update course content
exports.updateCourseContent = async (req, res) => {
    try {
        const { courseId, contentId } = req.params;
        const instructorId = req.user._id;
        const contentData = req.body;
        
        const content = await CourseService.updateCourseContent(courseId, contentId, instructorId, contentData);
        ResponseHandler.sendSuccess(res, 'Content updated successfully', content);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Delete course content
exports.deleteCourseContent = async (req, res) => {
    try {
        const { courseId, contentId } = req.params;
        const instructorId = req.user._id;
        
        await CourseService.deleteCourseContent(courseId, contentId, instructorId);
        ResponseHandler.sendSuccess(res, 'Content deleted successfully');
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Rate course
exports.rateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;
        const { rating, review } = req.body;
        
        const reviewData = await CourseService.rateCourse(courseId, userId, rating, review);
        ResponseHandler.sendSuccess(res, 'Course rated successfully', reviewData);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get course reviews
exports.getCourseReviews = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await CourseService.getCourseReviews(courseId, pagination);
        ResponseHandler.sendPaginated(res, 'Course reviews retrieved', result.reviews, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Search courses
exports.searchCourses = async (req, res) => {
    try {
        const { query, category, minPrice, maxPrice, rating, sortBy } = req.query;
        const { page = 1, limit = 20 } = req.query;
        
        const filters = { query, category, minPrice, maxPrice, rating };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await CourseService.searchCourses(filters, pagination, sortBy);
        ResponseHandler.sendPaginated(res, 'Courses found', result.courses, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get instructor courses
exports.getInstructorCourses = async (req, res) => {
    try {
        const instructorId = req.user._id;
        const { page = 1, limit = 20, status } = req.query;
        
        const filters = { status };
        const pagination = { page: parseInt(page), limit: parseInt(limit) };
        
        const result = await CourseService.getInstructorCourses(instructorId, filters, pagination);
        ResponseHandler.sendPaginated(res, 'Instructor courses retrieved', result.courses, result.pagination);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get course analytics
exports.getCourseAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;
        const instructorId = req.user._id;
        
        const analytics = await CourseService.getCourseAnalytics(courseId, instructorId);
        ResponseHandler.sendSuccess(res, 'Course analytics retrieved', analytics);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Update course status
exports.updateCourseStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const instructorId = req.user._id;
        const { status } = req.body;
        
        const course = await CourseService.updateCourseStatus(courseId, instructorId, status);
        ResponseHandler.sendSuccess(res, 'Course status updated', course);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get popular courses
exports.getPopularCourses = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const courses = await CourseService.getPopularCourses(parseInt(limit));
        
        ResponseHandler.sendSuccess(res, 'Popular courses retrieved', courses);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};

// Get categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await CourseService.getCategories();
        ResponseHandler.sendSuccess(res, 'Categories retrieved', categories);
    } catch (error) {
        ResponseHandler.sendError(res, error.message);
    }
};