const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalWithdrawn: {
        type: Number,
        default: 0
    },
    pendingWithdrawals: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR']
    },
    lastTransactionAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Transaction sub-document schema
const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    referenceType: {
        type: String,
        enum: [
            'course_purchase',
            'affiliate_commission',
            'withdrawal',
            'refund',
            'bonus',
            'correction',
            'other'
        ],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['Order', 'AffiliateCommission', 'WithdrawRequest', 'User']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed'
    },
    metadata: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

// Create indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ referenceId: 1, referenceType: 1 });

// Pre-save hook for transaction ID
transactionSchema.pre('save', function(next) {
    if (!this.transactionId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.transactionId = `TXN${timestamp}${random}`;
    }
    next();
});

// Method to add credit to wallet
walletSchema.methods.addCredit = async function(amount, description, reference) {
    try {
        if (amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }
        
        // Update wallet balance
        this.balance += amount;
        this.totalEarned += amount;
        this.lastTransactionAt = new Date();
        
        await this.save();
        
        // Create transaction record
        const Transaction = mongoose.model('Transaction');
        const transaction = new Transaction({
            wallet: this._id,
            user: this.user,
            type: 'credit',
            amount: amount,
            balanceAfter: this.balance,
            description: description,
            referenceType: reference.referenceType,
            referenceId: reference.referenceId,
            referenceModel: reference.referenceModel,
            metadata: reference.metadata || {}
        });
        
        await transaction.save();
        return transaction;
    } catch (error) {
        throw error;
    }
};

// Method to add debit from wallet
walletSchema.methods.addDebit = async function(amount, description, reference) {
    try {
        if (amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }
        
        if (this.balance < amount) {
            throw new Error('Insufficient balance');
        }
        
        // Update wallet balance
        this.balance -= amount;
        this.totalWithdrawn += amount;
        this.lastTransactionAt = new Date();
        
        await this.save();
        
        // Create transaction record
        const Transaction = mongoose.model('Transaction');
        const transaction = new Transaction({
            wallet: this._id,
            user: this.user,
            type: 'debit',
            amount: amount,
            balanceAfter: this.balance,
            description: description,
            referenceType: reference.referenceType,
            referenceId: reference.referenceId,
            referenceModel: reference.referenceModel,
            metadata: reference.metadata || {}
        });
        
        await transaction.save();
        return transaction;
    } catch (error) {
        throw error;
    }
};

// Check if wallet has sufficient balance
walletSchema.methods.hasSufficientBalance = function(amount) {
    return this.balance >= amount;
};

// Get wallet summary
walletSchema.methods.getSummary = function() {
    return {
        balance: this.balance,
        totalEarned: this.totalEarned,
        totalWithdrawn: this.totalWithdrawn,
        pendingWithdrawals: this.pendingWithdrawals,
        currency: this.currency,
        lastTransactionAt: this.lastTransactionAt
    };
};

const Wallet = mongoose.model('Wallet', walletSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Wallet, Transaction };