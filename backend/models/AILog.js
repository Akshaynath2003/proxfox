import mongoose from 'mongoose';

const aiLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    prompt: {
        type: String,
        required: true,
    },
    response: {
        type: String,
        required: true,
    },
    confidenceScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isFlagged: {
        type: Boolean,
        default: false,
    },
    adminReviewed: {
        type: Boolean,
        default: false,
    },
    adminAction: {
        type: String,
        enum: ['approved', 'blocked', 'retrained', 'none'],
        default: 'none',
    }
}, {
    timestamps: true,
});

const AILog = mongoose.model('AILog', aiLogSchema);

export default AILog;
