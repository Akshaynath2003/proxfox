import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
    ruleName: {
        type: String,
        required: true,
        unique: true,
    },
    ruleValue: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    description: {
        type: String,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true,
});

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
