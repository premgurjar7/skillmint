const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
    logId: {
        type: String,
        required: true,
        unique: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login',
            'logout',
            'create',
            'update',
            'delete',
            'approve',
            'reject',
            'export',
            'import',
            'settings_change',
            'user_management',
            'content_management',
            'financial_management',
            'system_management',
            'other'
        ]
    },
    module: {
        type: String,
        required: true,
        enum: [
            'user',
            'course',
            'order',
            'affiliate',
            'withdrawal',
            'payment',
            'wallet',
            'settings',
            'system',
            'reports',
            'dashboard',
            'other'
        ]
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    targetModel: {
        type: String,
        enum: [
            'User',
            'Course',
            'Order',
            'AffiliateCommission',
            'WithdrawRequest',
            'Wallet',
            'Transaction',
            'Settings',
            null
        ],
        default: null
    },
    description: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    location: {
        country: String,
        region: String,
        city: String,
        timezone: String
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'partial'],
        default: 'success'
    },
    executionTime: {
        type: Number, // in milliseconds
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, createdAt: -1 });
adminLogSchema.index({ module: 1, createdAt: -1 });
adminLogSchema.index({ severity: 1 });
adminLogSchema.index({ 'location.country': 1 });

// Pre-save hook to generate log ID
adminLogSchema.pre('save', function(next) {
    if (!this.logId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.logId = `LOG${timestamp}${random}`;
    }
    next();
});

// Static method to log admin action
adminLogSchema.statics.logAction = async function(data) {
    try {
        const {
            admin,
            action,
            module,
            targetId = null,
            targetModel = null,
            description,
            details = {},
            ipAddress,
            userAgent = '',
            location = {},
            severity = 'info',
            status = 'success',
            executionTime = 0
        } = data;
        
        const log = new this({
            admin,
            action,
            module,
            targetId,
            targetModel,
            description,
            details,
            ipAddress,
            userAgent,
            location,
            severity,
            status,
            executionTime
        });
        
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to log admin action:', error);
        // Don't throw error here to avoid breaking main functionality
        return null;
    }
};

// Static method to get logs with filters
adminLogSchema.statics.getLogs = async function(filters = {}, pagination = {}) {
    try {
        const {
            admin,
            action,
            module,
            severity,
            status,
            startDate,
            endDate,
            search
        } = filters;
        
        const {
            page = 1,
            limit = 50,
            sortBy = '-createdAt',
            select = ''
        } = pagination;
        
        const query = {};
        
        // Apply filters
        if (admin) query.admin = admin;
        if (action) query.action = action;
        if (module) query.module = module;
        if (severity) query.severity = severity;
        if (status) query.status = status;
        
        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        // Search filter
        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { 'details.changes': { $regex: search, $options: 'i' } },
                { logId: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Execute query
        const logs = await this.find(query)
            .populate('admin', 'name email role')
            .select(select)
            .sort(sortBy)
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Get total count
        const total = await this.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        
        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        throw error;
    }
};

// Static method to get statistics
adminLogSchema.statics.getStatistics = async function(startDate, endDate) {
    try {
        const matchStage = {};
        
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }
        
        const stats = await this.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    // Actions by type
                    actions: [
                        {
                            $group: {
                                _id: '$action',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } }
                    ],
                    
                    // Modules activity
                    modules: [
                        {
                            $group: {
                                _id: '$module',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } }
                    ],
                    
                    // Severity distribution
                    severity: [
                        {
                            $group: {
                                _id: '$severity',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    
                    // Status distribution
                    status: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    
                    // Top admins by activity
                    topAdmins: [
                        {
                            $group: {
                                _id: '$admin',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    
                    // Hourly activity
                    hourlyActivity: [
                        {
                            $group: {
                                _id: { $hour: '$createdAt' },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    
                    // Daily activity
                    dailyActivity: [
                        {
                            $group: {
                                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } },
                        { $limit: 30 }
                    ],
                    
                    // Average execution time
                    avgExecutionTime: [
                        {
                            $group: {
                                _id: null,
                                avgTime: { $avg: '$executionTime' },
                                maxTime: { $max: '$executionTime' },
                                minTime: { $min: '$executionTime' }
                            }
                        }
                    ],
                    
                    // Total counts
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalLogs: { $sum: 1 },
                                successful: {
                                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                                },
                                failed: {
                                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                                },
                                partial: {
                                    $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
                                }
                            }
                        }
                    ]
                }
            }
        ]);
        
        // Populate admin details for topAdmins
        if (stats[0]?.topAdmins?.length > 0) {
            const User = mongoose.model('User');
            const adminIds = stats[0].topAdmins.map(item => item._id);
            const admins = await User.find({ _id: { $in: adminIds } })
                .select('name email role')
                .lean();
            
            const adminMap = admins.reduce((map, admin) => {
                map[admin._id.toString()] = admin;
                return map;
            }, {});
            
            stats[0].topAdmins = stats[0].topAdmins.map(item => ({
                ...item,
                admin: adminMap[item._id.toString()] || { _id: item._id }
            }));
        }
        
        return stats[0] || {};
    } catch (error) {
        throw error;
    }
};

// Static method to clean old logs (retention policy)
adminLogSchema.statics.cleanOldLogs = async function(retentionDays = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        const result = await this.deleteMany({
            createdAt: { $lt: cutoffDate },
            severity: { $ne: 'critical' } // Keep critical logs forever
        });
        
        return {
            deletedCount: result.deletedCount,
            cutoffDate,
            retentionDays
        };
    } catch (error) {
        throw error;
    }
};

// Static method to export logs
adminLogSchema.statics.exportLogs = async function(filters = {}, format = 'json') {
    try {
        const logs = await this.find(filters)
            .populate('admin', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        
        if (format === 'csv') {
            // Convert to CSV format
            const headers = [
                'Log ID',
                'Timestamp',
                'Admin',
                'Action',
                'Module',
                'Description',
                'Severity',
                'Status',
                'IP Address',
                'Location'
            ];
            
            const csvData = logs.map(log => [
                log.logId,
                new Date(log.createdAt).toISOString(),
                log.admin ? `${log.admin.name} (${log.admin.email})` : 'N/A',
                log.action,
                log.module,
                log.description,
                log.severity,
                log.status,
                log.ipAddress,
                log.location ? `${log.location.city}, ${log.location.country}` : 'N/A'
            ]);
            
            return {
                format: 'csv',
                headers,
                data: csvData,
                count: logs.length
            };
        }
        
        return {
            format: 'json',
            data: logs,
            count: logs.length
        };
    } catch (error) {
        throw error;
    }
};

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

module.exports = AdminLog;