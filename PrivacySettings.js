const mongoose = require('mongoose');

const privacySettingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
    },
    emailVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'private'
    },
    locationVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
    },
    activityVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'friends'
    },
    searchable: {
        type: Boolean,
        default: true
    },
    showOnlineStatus: {
        type: Boolean,
        default: true
    },
    allowFriendRequests: {
        type: Boolean,
        default: true
    },
    allowMessages: {
        type: String,
        enum: ['everyone', 'friends', 'none'],
        default: 'everyone'
    },
    dataSharing: {
        analytics: {
            type: Boolean,
            default: true
        },
        recommendations: {
            type: Boolean,
            default: true
        },
        thirdParty: {
            type: Boolean,
            default: false
        }
    },
    notificationPreferences: {
        email: {
            securityAlerts: {
                type: Boolean,
                default: true
            },
            loginAlerts: {
                type: Boolean,
                default: true
            },
            updates: {
                type: Boolean,
                default: true
            },
            marketing: {
                type: Boolean,
                default: false
            }
        },
        push: {
            messages: {
                type: Boolean,
                default: true
            },
            friendRequests: {
                type: Boolean,
                default: true
            },
            activityUpdates: {
                type: Boolean,
                default: true
            }
        }
    }
}, {
    timestamps: true
});

// Create default privacy settings for new users
privacySettingsSchema.statics.createDefault = async function(userId) {
    return await this.create({ user: userId });
};

module.exports = mongoose.model('PrivacySettings', privacySettingsSchema);
