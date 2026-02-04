const mongoose = require('mongoose');

const affiliateCommissionSchema = new mongoose.Schema({
    commissionId: {
        type: String,
        required: true,
        unique: true
    },
    affiliate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referredUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    commissionAmount: {
        type: Number,
        required: true,
        min: [0, 'Commission amount cannot be negative']
    },
    commissionPercentage: {
        type: Number,
        required: true,
        min: [0, 'Commission percentage cannot be negative'],
        max: [50, 'Commission percentage cannot exceed 50%']
    },
    orderAmount: {
        type: Number,
        required: true,
        min: [0, 'Order amount cannot be negative']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
        default: 'pending'
    },
    level: {
        type: Number,
        default: 1,
        min: [1, 'Level cannot be less than 1'],
        max: [3, 'Level cannot exceed 3']
    },
    payoutDate: {
        type: Date,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['wallet', 'bank_transfer', 'upi', 'paypal'],
        default: 'wallet'
    },
    transactionId: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        referralSource: String
    }
}, {
    timestamps: true
});

// Pre-save hook to generate commission ID
affiliateCommissionSchema.pre('save', function(next) {
    if (!this.commissionId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.commissionId = `COM${timestamp}${random}`;
    }
    next();
});

// Check if commission is payable
affiliateCommissionSchema.methods.isPayable = function() {
    return this.status === 'approved' && !this.payoutDate;
};

// Mark commission as paid
affiliateCommissionSchema.methods.markAsPaid = async function(paymentMethod, transactionId = null) {
    try {
        this.status = 'paid';
        this.paymentMethod = paymentMethod;
        this.transactionId = transactionId;
        this.payoutDate = new Date();
        
        await this.save();
        
        // Update affiliate's wallet
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(this.affiliate, {
            $inc: { 
                walletBalance: this.commissionAmount,
                totalEarned: this.commissionAmount
            }
        });
        
        return this;
    } catch (error) {
        throw error;
    }
};

// Approve commission
affiliateCommissionSchema.methods.approveCommission = function(notes = '') {
    this.status = 'approved';
    if (notes) {
        this.notes = notes;
    }
    return this.save();
};

// Reject commission
affiliateCommissionSchema.methods.rejectCommission = function(notes = '') {
    this.status = 'rejected';
    if (notes) {
        this.notes = notes;
    }
    return this.save();
};

// Calculate commission for multi-level
affiliateCommissionSchema.statics.calculateMultiLevelCommission = async function(orderId, levels = {1: 10, 2: 5, 3: 2}) {
    try {
        const Order = mongoose.model('Order');
        const User = mongoose.model('User');
        
        const order = await Order.findById(orderId)
            .populate('user')
            .populate('course');
        
        if (!order || !order.referralUsed) {
            return [];
        }
        
        const commissions = [];
        let currentAffiliateId = order.referralUsed;
        
        // Level 1 commission (direct referral)
        if (levels[1] > 0 && currentAffiliateId) {
            const level1Commission = (order.finalAmount * levels[1]) / 100;
            
            const commission = new this({
                affiliate: currentAffiliateId,
                referredUser: order.user._id,
                order: order._id,
                course: order.course._id,
                commissionAmount: level1Commission,
                commissionPercentage: levels[1],
                orderAmount: order.finalAmount,
                level: 1,
                status: 'pending',
                metadata: {
                    ipAddress: order.metadata?.ipAddress,
                    userAgent: order.metadata?.userAgent,
                    referralSource: 'direct'
                }
            });
            
            commissions.push(commission);
        }
        
        // Level 2 commission (referral of referral)
        if (levels[2] > 0) {
            const affiliate = await User.findById(currentAffiliateId);
            if (affiliate && affiliate.referredBy) {
                const level2Commission = (order.finalAmount * levels[2]) / 100;
                
                const commission = new this({
                    affiliate: affiliate.referredBy,
                    referredUser: order.user._id,
                    order: order._id,
                    course: order.course._id,
                    commissionAmount: level2Commission,
                    commissionPercentage: levels[2],
                    orderAmount: order.finalAmount,
                    level: 2,
                    status: 'pending',
                    metadata: {
                        ipAddress: order.metadata?.ipAddress,
                        userAgent: order.metadata?.userAgent,
                        referralSource: 'indirect'
                    }
                });
                
                commissions.push(commission);
            }
        }
        
        // Level 3 commission (3rd level)
        if (levels[3] > 0) {
            const affiliate = await User.findById(currentAffiliateId);
            if (affiliate && affiliate.referredBy) {
                const level2Affiliate = await User.findById(affiliate.referredBy);
                if (level2Affiliate && level2Affiliate.referredBy) {
                    const level3Commission = (order.finalAmount * levels[3]) / 100;
                    
                    const commission = new this({
                        affiliate: level2Affiliate.referredBy,
                        referredUser: order.user._id,
                        order: order._id,
                        course: order.course._id,
                        commissionAmount: level3Commission,
                        commissionPercentage: levels[3],
                        orderAmount: order.finalAmount,
                        level: 3,
                        status: 'pending',
                        metadata: {
                            ipAddress: order.metadata?.ipAddress,
                            userAgent: order.metadata?.userAgent,
                            referralSource: 'indirect'
                        }
                    });
                    
                    commissions.push(commission);
                }
            }
        }
        
        return commissions;
    } catch (error) {
        throw error;
    }
};

// Get total commissions by affiliate
affiliateCommissionSchema.statics.getAffiliateStats = async function(affiliateId) {
    try {
        const stats = await this.aggregate([
            { $match: { affiliate: mongoose.Types.ObjectId(affiliateId) } },
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$commissionAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const totalStats = await this.aggregate([
            { $match: { affiliate: mongoose.Types.ObjectId(affiliateId) } },
            {
                $group: {
                    _id: null,
                    totalEarned: { $sum: '$commissionAmount' },
                    totalOrders: { $sum: 1 },
                    pendingAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0]
                        }
                    },
                    approvedAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0]
                        }
                    },
                    paidAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0]
                        }
                    }
                }
            }
        ]);
        
        return {
            byStatus: stats,
            total: totalStats[0] || {
                totalEarned: 0,
                totalOrders: 0,
                pendingAmount: 0,
                approvedAmount: 0,
                paidAmount: 0
            }
        };
    } catch (error) {
        throw error;
    }
};

const AffiliateCommission = mongoose.model('AffiliateCommission', affiliateCommissionSchema);

module.exports = AffiliateCommission;