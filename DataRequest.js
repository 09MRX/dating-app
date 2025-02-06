const mongoose = require('mongoose');

const dataRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['EXPORT', 'DELETION', 'ACCESS', 'RECTIFICATION'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SCHEDULED'],
        default: 'PENDING'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    expiresAt: Date,
    downloadUrl: String,
    notes: String,
    metadata: {
        ipAddress: String,
        userAgent: String,
        reason: String
    }
}, {
    timestamps: true
});

// Indexes
dataRequestSchema.index({ user: 1, type: 1 });
dataRequestSchema.index({ status: 1 });
dataRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
dataRequestSchema.methods.markAsCompleted = async function(downloadUrl = null) {
    this.status = 'COMPLETED';
    this.completedAt = new Date();
    if (downloadUrl) {
        this.downloadUrl = downloadUrl;
    }
    return await this.save();
};

dataRequestSchema.methods.markAsFailed = async function(notes) {
    this.status = 'FAILED';
    this.notes = notes;
    return await this.save();
};

// Statics
dataRequestSchema.statics.getPendingRequests = function() {
    return this.find({ status: 'PENDING' }).sort({ requestedAt: 1 });
};

dataRequestSchema.statics.getRequestsByUser = function(userId) {
    return this.find({ user: userId }).sort({ requestedAt: -1 });
};

module.exports = mongoose.model('DataRequest', dataRequestSchema);
