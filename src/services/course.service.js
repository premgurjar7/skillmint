// src/services/course.service.js - BASIC
class CourseService {
    static async getAllCourses(filters = {}, pagination = {}) {
        // Mock data for now
        return {
            courses: [
                {
                    id: 1,
                    title: 'Web Development Basics',
                    description: 'Learn HTML, CSS, and JavaScript',
                    instructor: 'John Doe',
                    price: 499,
                    rating: 4.5,
                    students: 1250,
                    category: 'Web Development'
                },
                {
                    id: 2,
                    title: 'JavaScript Advanced',
                    description: 'Advanced JavaScript concepts',
                    instructor: 'Jane Smith',
                    price: 799,
                    rating: 4.8,
                    students: 890,
                    category: 'Web Development'
                },
                {
                    id: 3,
                    title: 'Node.js Backend',
                    description: 'Build backend with Node.js',
                    instructor: 'Alex Johnson',
                    price: 999,
                    rating: 4.7,
                    students: 1540,
                    category: 'Backend'
                }
            ],
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                total: 3,
                pages: 1
            }
        };
    }

    static async getCourseById(id) {
        return {
            id: parseInt(id),
            title: 'Sample Course',
            description: 'This is a sample course',
            instructor: 'Instructor Name',
            price: 499,
            rating: 4.5,
            students: 1000,
            category: 'Development',
            createdAt: new Date().toISOString()
        };
    }

    static async createCourse(instructorId, courseData) {
        return {
            ...courseData,
            id: Date.now(),
            instructor: instructorId,
            createdAt: new Date().toISOString(),
            status: 'draft'
        };
    }
}

module.exports = CourseService;