const mongoose = require('mongoose');

const accountActivitySchema = new mongoose.Schema({
    user: {
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
            'password_change',
            'password_reset',
            'email_change',
            'profile_update',
            '2fa_enabled',
            '2fa_disabled',
            'account_locked',
            'failed_login'
        ]
    },
    ip: String,
    device: String,
    browser: String,
    location: String,
    status: {
        type: String,
        enum: ['success', 'failure'],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster queries
accountActivitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AccountActivity', accountActivitySchema);
