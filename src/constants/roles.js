const ROLES = {
    // User roles
    ADMIN: 'admin',
    INSTRUCTOR: 'instructor',
    AFFILIATE: 'affiliate',
    STUDENT: 'student',

    // Role hierarchy (higher number = more permissions)
    ROLE_HIERARCHY: {
        'admin': 4,
        'instructor': 3,
        'affiliate': 2,
        'student': 1
    },

    // Role descriptions
    DESCRIPTIONS: {
        'admin': 'System administrator with full access',
        'instructor': 'Course creator and instructor',
        'affiliate': 'Referral and marketing partner',
        'student': 'Course learner and consumer'
    },

    // Default role for new users
    DEFAULT_ROLE: 'student',

    // Roles that can create courses
    COURSE_CREATORS: ['instructor', 'admin'],

    // Roles that can receive affiliate commissions
    COMMISSION_EARNERS: ['affiliate', 'instructor', 'admin'],

    // Roles that can access admin panel
    ADMIN_ACCESS: ['admin'],

    // Roles that can access instructor dashboard
    INSTRUCTOR_ACCESS: ['instructor', 'admin'],

    // Roles that can access affiliate dashboard
    AFFILIATE_ACCESS: ['affiliate', 'admin'],

    // Minimum role requirements for features
    REQUIREMENTS: {
        CREATE_COURSE: ['instructor', 'admin'],
        UPLOAD_CONTENT: ['instructor', 'admin'],
        EARN_COMMISSIONS: ['affiliate', 'instructor', 'admin'],
        WITHDRAW_FUNDS: ['affiliate', 'instructor', 'admin'],
        MANAGE_USERS: ['admin'],
        MANAGE_COURSES: ['admin'],
        VIEW_ANALYTICS: ['instructor', 'admin'],
        ACCESS_ADMIN_PANEL: ['admin']
    },

    // Role transition rules (which roles can switch to which)
    TRANSITIONS: {
        'student': ['instructor', 'affiliate'],
        'affiliate': ['instructor'],
        'instructor': ['affiliate'],
        'admin': [] // Admin cannot switch to other roles
    },

    // Permissions matrix
    PERMISSIONS: {
        // User management
        VIEW_ALL_USERS: ['admin'],
        CREATE_USER: ['admin'],
        UPDATE_USER: ['admin'],
        DELETE_USER: ['admin'],
        UPDATE_USER_ROLE: ['admin'],
        DEACTIVATE_USER: ['admin'],

        // Course management
        CREATE_COURSE: ['instructor', 'admin'],
        UPDATE_ANY_COURSE: ['admin'],
        DELETE_ANY_COURSE: ['admin'],
        PUBLISH_COURSE: ['instructor', 'admin'],
        ARCHIVE_COURSE: ['instructor', 'admin'],
        FEATURE_COURSE: ['admin'],
        VIEW_ALL_COURSES: ['admin'],
        VIEW_DRAFT_COURSES: ['instructor', 'admin'],

        // Content management
        UPLOAD_VIDEO: ['instructor', 'admin'],
        UPLOAD_DOCUMENT: ['instructor', 'admin'],
        MANAGE_CONTENT: ['instructor', 'admin'],

        // Order management
        VIEW_ALL_ORDERS: ['admin'],
        PROCESS_REFUNDS: ['admin'],
        VIEW_ORDER_ANALYTICS: ['admin'],

        // Affiliate management
        VIEW_ALL_COMMISSIONS: ['admin'],
        APPROVE_COMMISSIONS: ['admin'],
        PROCESS_COMMISSIONS: ['admin'],
        VIEW_AFFILIATE_ANALYTICS: ['admin'],

        // Wallet management
        VIEW_ALL_WALLETS: ['admin'],
        CREDIT_WALLET: ['admin'],
        DEBIT_WALLET: ['admin'],
        VIEW_WALLET_TRANSACTIONS: ['admin'],

        // Withdrawal management
        VIEW_ALL_WITHDRAWALS: ['admin'],
        APPROVE_WITHDRAWALS: ['admin'],
        REJECT_WITHDRAWALS: ['admin'],
        PROCESS_WITHDRAWALS: ['admin'],

        // Settings management
        UPDATE_SYSTEM_SETTINGS: ['admin'],
        UPDATE_PAYMENT_SETTINGS: ['admin'],
        UPDATE_COMMISSION_SETTINGS: ['admin'],
        UPDATE_WITHDRAWAL_SETTINGS: ['admin'],

        // Analytics & Reports
        VIEW_SYSTEM_ANALYTICS: ['admin'],
        GENERATE_REPORTS: ['admin'],
        EXPORT_DATA: ['admin'],

        // Student permissions
        ENROLL_IN_COURSE: ['student', 'instructor', 'affiliate', 'admin'],
        VIEW_MY_COURSES: ['student', 'instructor', 'affiliate', 'admin'],
        ACCESS_COURSE_CONTENT: ['student', 'instructor', 'admin'],
        SUBMIT_ASSIGNMENTS: ['student', 'instructor', 'admin'],
        TAKE_QUIZZES: ['student', 'instructor', 'admin'],

        // Instructor permissions
        VIEW_MY_STUDENTS: ['instructor', 'admin'],
        GRADE_ASSIGNMENTS: ['instructor', 'admin'],
        CREATE_QUIZZES: ['instructor', 'admin'],
        VIEW_COURSE_ANALYTICS: ['instructor', 'admin'],
        EARN_FROM_COURSES: ['instructor', 'admin'],

        // Affiliate permissions
        GENERATE_REFERRAL_LINKS: ['affiliate', 'admin'],
        VIEW_REFERRAL_STATS: ['affiliate', 'admin'],
        EARN_COMMISSIONS: ['affiliate', 'admin'],
        REQUEST_WITHDRAWALS: ['affiliate', 'instructor', 'admin']
    },

    // Role-based rate limits (requests per minute)
    RATE_LIMITS: {
        'admin': 1000,
        'instructor': 500,
        'affiliate': 300,
        'student': 200,
        'guest': 100
    },

    // Role-based API access
    API_ACCESS: {
        // Public APIs (no auth required)
        PUBLIC: [
            'GET /api/courses',
            'GET /api/courses/:id',
            'GET /api/instructors',
            'GET /api/instructors/:id',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/forgot-password',
            'POST /api/auth/reset-password'
        ],

        // Student APIs
        STUDENT: [
            'GET /api/users/profile',
            'PUT /api/users/profile',
            'GET /api/users/courses',
            'POST /api/courses/:id/enroll',
            'GET /api/courses/:id/content',
            'POST /api/courses/:id/progress',
            'GET /api/orders/my-orders',
            'GET /api/wallet',
            'GET /api/wallet/transactions'
        ],

        // Instructor APIs
        INSTRUCTOR: [
            'POST /api/courses',
            'PUT /api/courses/:id',
            'DELETE /api/courses/:id',
            'GET /api/courses/my-courses',
            'GET /api/courses/:id/analytics',
            'GET /api/courses/:id/students',
            'POST /api/courses/:id/content',
            'GET /api/earnings',
            'GET /api/earnings/analytics'
        ],

        // Affiliate APIs
        AFFILIATE: [
            'GET /api/affiliate/dashboard',
            'GET /api/affiliate/referrals',
            'GET /api/affiliate/commissions',
            'POST /api/affiliate/generate-link',
            'GET /api/affiliate/analytics',
            'POST /api/withdrawals',
            'GET /api/withdrawals/my-withdrawals'
        ],

        // Admin APIs
        ADMIN: [
            'GET /api/admin/users',
            'POST /api/admin/users',
            'PUT /api/admin/users/:id',
            'DELETE /api/admin/users/:id',
            'GET /api/admin/courses',
            'PUT /api/admin/courses/:id/status',
            'GET /api/admin/orders',
            'GET /api/admin/commissions',
            'PUT /api/admin/commissions/:id/status',
            'GET /api/admin/withdrawals',
            'PUT /api/admin/withdrawals/:id/status',
            'GET /api/admin/analytics',
            'GET /api/admin/reports',
            'PUT /api/admin/settings'
        ]
    },

    // Role validation functions
    isValidRole: (role) => {
        return Object.values(ROLES).includes(role);
    },

    canSwitchRole: (fromRole, toRole) => {
        return ROLES.TRANSITIONS[fromRole]?.includes(toRole) || false;
    },

    hasPermission: (role, permission) => {
        return ROLES.PERMISSIONS[permission]?.includes(role) || false;
    },

    hasHigherRole: (role1, role2) => {
        return ROLES.ROLE_HIERARCHY[role1] > ROLES.ROLE_HIERARCHY[role2];
    },

    hasEqualOrHigherRole: (role1, role2) => {
        return ROLES.ROLE_HIERARCHY[role1] >= ROLES.ROLE_HIERARCHY[role2];
    },

    getAllRoles: () => {
        return ['admin', 'instructor', 'affiliate', 'student'];
    },

    getRoleDescription: (role) => {
        return ROLES.DESCRIPTIONS[role] || 'Unknown role';
    },

    getRoleRateLimit: (role) => {
        return ROLES.RATE_LIMITS[role] || 100;
    }
};

module.exports = ROLES;