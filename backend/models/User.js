import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
    },
    phoneNumber: {
        type: String,
        required: [true, 'Please add a phone number'],
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin', 'finance_moderator', 'ai_moderator', 'support_executive'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'deactivated'],
        default: 'active',
    },
    kycVerified: {
        type: Boolean,
        default: false,
    },
    subscriptionPlan: {
        type: String,
        enum: ['free', 'pro', 'premium'],
        default: 'free',
    }
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
