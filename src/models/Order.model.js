const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    finalAmount: {
        type: Number,
        required: true,
        min: [0, 'Final amount cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    couponCode: {
        type: String,
        default: null
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'wallet', 'cod'],
        default: 'razorpay'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'cancelled'],
        default: 'pending'
    },
    referralUsed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    affiliateCommission: {
        type: Number,
        default: 0
    },
    instructorEarnings: {
        type: Number,
        default: 0
    },
    platformEarnings: {
        type: Number,
        default: 0
    },
    commissionStatus: {
        type: String,
        enum: ['pending', 'processed', 'rejected'],
        default: 'pending'
    },
    commissionProcessedAt: {
        type: Date,
        default: null
    },
    isRefundRequested: {
        type: Boolean,
        default: false
    },
    refundStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processed'],
        default: 'pending'
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundProcessedAt: {
        type: Date,
        default: null
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        device: String
    }
}, {
    timestamps: true
});

// Pre-save hook to generate order ID
orderSchema.pre('save', function(next) {
    if (!this.orderId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.orderId = `ORD${timestamp}${random}`;
    }
    
    // Calculate final amount
    if (this.amount && this.discount) {
        this.finalAmount = this.amount - this.discount;
    } else if (this.amount) {
        this.finalAmount = this.amount;
    }
    
    next();
});

// Calculate earnings based on course percentages
orderSchema.methods.calculateEarnings = async function() {
    try {
        const course = await mongoose.model('Course').findById(this.course);
        if (!course) {
            throw new Error('Course not found');
        }
        
        this.affiliateCommission = course.calculateAffiliateCommission();
        this.instructorEarnings = course.calculateInstructorEarnings();
        this.platformEarnings = this.finalAmount - (this.affiliateCommission + this.instructorEarnings);
        
        return this;
    } catch (error) {
        throw error;
    }
};

// Check if order is eligible for commission
orderSchema.methods.isEligibleForCommission = function() {
    return this.paymentStatus === 'completed' && 
           this.orderStatus === 'completed' && 
           this.commissionStatus === 'pending';
};

// Mark commission as processed
orderSchema.methods.markCommissionProcessed = function() {
    this.commissionStatus = 'processed';
    this.commissionProcessedAt = new Date();
    return this.save();
};

// Check if order can be refunded
orderSchema.methods.canBeRefunded = function() {
    const orderDate = new Date(this.createdAt);
    const currentDate = new Date();
    const daysDifference = (currentDate - orderDate) / (1000 * 60 * 60 * 24);
    
    return this.paymentStatus === 'completed' && 
           !this.isRefundRequested && 
           daysDifference <= 30; // 30-day refund policy
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;