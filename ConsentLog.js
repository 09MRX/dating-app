const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    consentType: {
        type: String,
        enum: [
            'MARKETING_EMAIL',
            'ANALYTICS',
            'THIRD_PARTY_SHARING',
            'COOKIES_ESSENTIAL',
            'COOKIES_ANALYTICS',
            'COOKIES_MARKETING',
            'LOCATION_TRACKING',
            'DATA_PROCESSING',
            'DATA_TRANSFER',
            'DATA_RETENTION',
            'DATA_ANONYMIZATION'
        ],
        required: true
    },
    granted: {
        type: Boolean,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    expiresAt: Date,
    metadata: {
        ipAddress: String,
        userAgent: String,
        location: String,
        platform: String
    },
    version: {
        type: String,
        required: true,
        default: '1.0'
    },
    documentReference: {
        type: String,
        required: true,
        default: 'PRIVACY_POLICY_V1'
    }
}, {
    timestamps: true
});

// Indexes
consentLogSchema.index({ user: 1, consentType: 1 });
consentLogSchema.index({ timestamp: 1 });
consentLogSchema.index({ expiresAt: 1 });

// Methods
consentLogSchema.methods.isValid = function() {
    if (!this.expiresAt) return true;
    return this.expiresAt > new Date();
};

consentLogSchema.methods.revoke = async function(reason) {
    this.granted = false;
    this.metadata.revocationReason = reason;
    this.metadata.revokedAt = new Date();
    return await this.save();
};

// Statics
consentLogSchema.statics.getCurrentConsent = async function(userId, consentType) {
    return this.findOne({
        user: userId,
        consentType,
        granted: true,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    }).sort({ timestamp: -1 });
};

consentLogSchema.statics.getConsentHistory = async function(userId) {
    return this.find({ user: userId })
        .sort({ timestamp: -1 })
        .select('-metadata.ipAddress');
};

// Pre-save middleware
consentLogSchema.pre('save', function(next) {
    // Add IP address if not present
    if (!this.metadata.ipAddress) {
        this.metadata.ipAddress = 'ANONYMIZED';
    }
    next();
});

module.exports = mongoose.model('ConsentLog', consentLogSchema);
