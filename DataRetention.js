const mongoose = require('mongoose');

const dataRetentionSchema = new mongoose.Schema({
    dataType: {
        type: String,
        enum: [
            'USER_PROFILE',
            'ACTIVITY_LOGS',
            'MESSAGES',
            'ANALYTICS',
            'AUDIT_LOGS',
            'CONSENT_RECORDS',
            'SECURITY_LOGS',
            'PAYMENT_INFO',
            'USAGE_STATS',
            'BACKUP_DATA'
        ],
        required: true,
        unique: true
    },
    retentionPeriod: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['DAYS', 'MONTHS', 'YEARS'],
            required: true
        }
    },
    autoDelete: {
        type: Boolean,
        default: true
    },
    anonymizeInstead: {
        type: Boolean,
        default: false
    },
    exemptions: [{
        type: String,
        enum: [
            'LEGAL_HOLD',
            'USER_REQUEST',
            'REGULATORY_REQUIREMENT',
            'BUSINESS_CRITICAL'
        ]
    }],
    lastApplied: Date,
    nextScheduledRun: Date,
    policy: {
        version: {
            type: String,
            required: true,
            default: '1.0'
        },
        description: String,
        legalBasis: {
            type: String,
            enum: [
                'CONSENT',
                'CONTRACT',
                'LEGAL_OBLIGATION',
                'VITAL_INTERESTS',
                'PUBLIC_TASK',
                'LEGITIMATE_INTERESTS'
            ],
            required: true
        }
    }
}, {
    timestamps: true
});

// Indexes
dataRetentionSchema.index({ dataType: 1 }, { unique: true });
dataRetentionSchema.index({ nextScheduledRun: 1 });

// Methods
dataRetentionSchema.methods.calculateNextRun = function() {
    const now = new Date();
    const { value, unit } = this.retentionPeriod;
    
    switch(unit) {
        case 'DAYS':
            return new Date(now.setDate(now.getDate() + value));
        case 'MONTHS':
            return new Date(now.setMonth(now.getMonth() + value));
        case 'YEARS':
            return new Date(now.setFullYear(now.getFullYear() + value));
        default:
            throw new Error('Invalid retention period unit');
    }
};

dataRetentionSchema.methods.shouldRetainData = function(dataCreationDate) {
    if (!dataCreationDate) return false;
    
    const now = new Date();
    const retentionEnd = this.calculateRetentionEnd(dataCreationDate);
    
    return now <= retentionEnd;
};

dataRetentionSchema.methods.calculateRetentionEnd = function(startDate) {
    const { value, unit } = this.retentionPeriod;
    const endDate = new Date(startDate);
    
    switch(unit) {
        case 'DAYS':
            endDate.setDate(endDate.getDate() + value);
            break;
        case 'MONTHS':
            endDate.setMonth(endDate.getMonth() + value);
            break;
        case 'YEARS':
            endDate.setFullYear(endDate.getFullYear() + value);
            break;
        default:
            throw new Error('Invalid retention period unit');
    }
    
    return endDate;
};

// Statics
dataRetentionSchema.statics.getExpiredData = async function(dataType) {
    const policy = await this.findOne({ dataType });
    if (!policy) throw new Error('No retention policy found for data type');
    
    const threshold = policy.calculateRetentionEnd(new Date());
    
    // This would need to be implemented based on the specific data type
    // Return data that's older than the retention period
    return [];
};

// Pre-save middleware
dataRetentionSchema.pre('save', function(next) {
    if (this.isModified('retentionPeriod')) {
        this.nextScheduledRun = this.calculateNextRun();
    }
    next();
});

module.exports = mongoose.model('DataRetention', dataRetentionSchema);
