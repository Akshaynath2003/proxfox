import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    amount: {
        type: Number,
        required: [true, 'Please add an amount'],
    },
    type: {
        type: String,
        enum: ['income', 'expense', 'investment'],
        required: [true, 'Please add a transaction type'],
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
    },
    description: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    isFlagged: { // For high-risk or suspicious transactions
        type: Boolean,
        default: false,
    },
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
