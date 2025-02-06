const mongoose = require('mongoose');

const socialLinkSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    platform: {
        type: String,
        required: true,
        enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'github']
    },
    platformUserId: {
        type: String,
        required: true
    },
    username: String,
    profileUrl: String,
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: String,
    tokenExpiry: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    lastSync: Date,
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
socialLinkSchema.index({ user: 1, platform: 1 }, { unique: true });
socialLinkSchema.index({ platformUserId: 1, platform: 1 }, { unique: true });

// Method to check if token needs refresh
socialLinkSchema.methods.needsRefresh = function() {
    if (!this.tokenExpiry) return true;
    // Refresh if token expires in less than 24 hours
    return this.tokenExpiry.getTime() - Date.now() < 24 * 60 * 60 * 1000;
};

module.exports = mongoose.model('SocialLink', socialLinkSchema);
