const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [100, 'Minimum withdrawal amount is ₹100']
    },
    requestedAmount: {
        type: Number,
        required: true,
        min: [100, 'Minimum withdrawal amount is ₹100']
    },
    processingFee: {
        type: Number,
        default: 0,
        min: [0, 'Processing fee cannot be negative']
    },
    netAmount: {
        type: Number,
        required: true,
        min: [0, 'Net amount cannot be negative']
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'upi', 'paypal', 'wallet'],
        required: true
    },
    paymentDetails: {
        // For bank transfer
        accountNumber: String,
        accountHolderName: String,
        bankName: String,
        ifscCode: String,
        
        // For UPI
        upiId: String,
        
        // For PayPal
        paypalEmail: String,
        
        // Common
        transactionNote: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'],
        default: 'pending'
    },
    adminNotes: {
        type: String,
        default: ''
    },
    userNotes: {
        type: String,
        default: ''
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    },
    transactionId: {
        type: String,
        default: null
    },
    receiptUrl: {
        type: String,
        default: null
    },
    failureReason: {
        type: String,
        default: ''
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        walletBalanceAtRequest: Number
    }
}, {
    timestamps: true
});

// Pre-save hook
withdrawRequestSchema.pre('save', function(next) {
    // Generate request ID
    if (!this.requestId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.requestId = `WDR${timestamp}${random}`;
    }
    
    // Calculate processing fee (2% or minimum ₹10)
    if (this.amount >= 100) {
        const calculatedFee = (this.amount * 2) / 100;
        this.processingFee = Math.max(calculatedFee, 10);
        this.netAmount = this.amount - this.processingFee;
    }
    
    // Set requested amount
    if (!this.requestedAmount) {
        this.requestedAmount = this.amount;
    }
    
    next();
});

// Pre-validate hook
withdrawRequestSchema.pre('validate', async function(next) {
    try {
        // Check if user has sufficient balance
        const User = mongoose.model('User');
        const user = await User.findById(this.user).select('walletBalance');
        
        if (!user) {
            throw new Error('User not found');
        }
        
        if (user.walletBalance < this.amount) {
            throw new Error('Insufficient wallet balance');
        }
        
        // Store wallet balance at request time
        this.metadata = {
            ...this.metadata,
            walletBalanceAtRequest: user.walletBalance
        };
        
        next();
    } catch (error) {
        next(error);
    }
});

// Method to approve withdrawal
withdrawRequestSchema.methods.approve = async function(adminId, notes = '') {
    try {
        if (this.status !== 'pending') {
            throw new Error('Only pending withdrawals can be approved');
        }
        
        this.status = 'processing';
        this.approvedBy = adminId;
        this.approvedAt = new Date();
        this.adminNotes = notes || this.adminNotes;
        
        // Deduct amount from user's wallet
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(this.user, {
            $inc: { 
                walletBalance: -this.amount,
                totalWithdrawn: this.amount
            }
        });
        
        // Update wallet's pending withdrawals
        const { Wallet } = require('./Wallet.model');
        const wallet = await Wallet.findOne({ user: this.user });
        if (wallet) {
            wallet.pendingWithdrawals += this.amount;
            await wallet.save();
        }
        
        await this.save();
        return this;
    } catch (error) {
        throw error;
    }
};

// Method to mark as completed
withdrawRequestSchema.methods.complete = async function(transactionId, receiptUrl = null) {
    try {
        if (this.status !== 'processing') {
            throw new Error('Only processing withdrawals can be marked as completed');
        }
        
        this.status = 'completed';
        this.processedAt = new Date();
        this.transactionId = transactionId;
        
        if (receiptUrl) {
            this.receiptUrl = receiptUrl;
        }
        
        // Update wallet's pending withdrawals
        const { Wallet } = require('./Wallet.model');
        const wallet = await Wallet.findOne({ user: this.user });
        if (wallet) {
            wallet.pendingWithdrawals -= this.amount;
            await wallet.save();
        }
        
        // Create wallet transaction
        if (wallet) {
            await wallet.addDebit(this.amount, 'Withdrawal processed', {
                referenceType: 'withdrawal',
                referenceId: this._id,
                referenceModel: 'WithdrawRequest',
                metadata: {
                    transactionId: transactionId,
                    netAmount: this.netAmount,
                    processingFee: this.processingFee
                }
            });
        }
        
        await this.save();
        return this;
    } catch (error) {
        throw error;
    }
};

// Method to reject withdrawal
withdrawRequestSchema.methods.reject = async function(reason, adminId = null) {
    try {
        if (!['pending', 'processing'].includes(this.status)) {
            throw new Error('Cannot reject withdrawal in current status');
        }
        
        this.status = 'rejected';
        this.failureReason = reason;
        
        if (adminId) {
            this.approvedBy = adminId;
        }
        
        // Refund amount to user's wallet if it was deducted
        if (this.status === 'processing') {
            const User = mongoose.model('User');
            await User.findByIdAndUpdate(this.user, {
                $inc: { 
                    walletBalance: this.amount,
                    totalWithdrawn: -this.amount
                }
            });
            
            // Update wallet's pending withdrawals
            const { Wallet } = require('./Wallet.model');
            const wallet = await Wallet.findOne({ user: this.user });
            if (wallet) {
                wallet.pendingWithdrawals -= this.amount;
                await wallet.save();
            }
        }
        
        await this.save();
        return this;
    } catch (error) {
        throw error;
    }
};

// Method to cancel withdrawal (by user)
withdrawRequestSchema.methods.cancel = async function() {
    try {
        if (this.status !== 'pending') {
            throw new Error('Only pending withdrawals can be cancelled');
        }
        
        this.status = 'cancelled';
        await this.save();
        return this;
    } catch (error) {
        throw error;
    }
};

// Static method to check minimum withdrawal amount
withdrawRequestSchema.statics.getWithdrawalSettings = function() {
    return {
        minAmount: 100,
        maxAmount: 50000,
        processingFeePercentage: 2,
        minProcessingFee: 10,
        processingTime: '3-5 business days'
    };
};

// Get withdrawal statistics
withdrawRequestSchema.statics.getStatistics = async function() {
    try {
        const stats = await this.aggregate([
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$amount' }
                }
            }
        ]);
        
        const totalStats = await this.aggregate([
            {
                $group: {
                    _id: null,
                    totalRequested: { $sum: '$amount' },
                    totalProcessed: { 
                        $sum: { 
                            $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] 
                        } 
                    },
                    totalPending: { 
                        $sum: { 
                            $cond: [{ 
                                $in: ['$status', ['pending', 'processing']] 
                            }, '$amount', 0] 
                        } 
                    },
                    totalCount: { $sum: 1 },
                    totalFees: { $sum: '$processingFee' }
                }
            }
        ]);
        
        return {
            byStatus: stats,
            totals: totalStats[0] || {
                totalRequested: 0,
                totalProcessed: 0,
                totalPending: 0,
                totalCount: 0,
                totalFees: 0
            }
        };
    } catch (error) {
        throw error;
    }
};

const WithdrawRequest = mongoose.model('WithdrawRequest', withdrawRequestSchema);

module.exports = WithdrawRequest;