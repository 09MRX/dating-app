const User = require('../models/User');
const PrivacySettings = require('../models/PrivacySettings');
const DataRequest = require('../models/DataRequest');
const ConsentLog = require('../models/ConsentLog');
const DataRetention = require('../models/DataRetention');
const emailNotification = require('./emailNotification');

class GDPRService {
    async requestDataExport(userId) {
        try {
            const request = await DataRequest.create({
                user: userId,
                type: 'EXPORT',
                status: 'PENDING'
            });

            // Start export process
            const exportData = await this.gatherUserData(userId);
            await this.generateExportPackage(exportData);

            // Update request status
            request.status = 'COMPLETED';
            request.completedAt = new Date();
            await request.save();

            // Notify user
            const user = await User.findById(userId);
            await emailNotification.sendDataExportNotification(user, exportData.downloadUrl);

            return request;
        } catch (error) {
            console.error('Data export request failed:', error);
            throw error;
        }
    }

    async requestDataDeletion(userId) {
        try {
            const request = await DataRequest.create({
                user: userId,
                type: 'DELETION',
                status: 'PENDING'
            });

            // Schedule deletion after retention period
            await this.scheduleDataDeletion(userId);

            // Update request status
            request.status = 'SCHEDULED';
            await request.save();

            // Notify user
            const user = await User.findById(userId);
            await emailNotification.sendDeletionRequestConfirmation(user);

            return request;
        } catch (error) {
            console.error('Data deletion request failed:', error);
            throw error;
        }
    }

    async logConsent(userId, type, granted) {
        try {
            const consent = await ConsentLog.create({
                user: userId,
                consentType: type,
                granted,
                timestamp: new Date()
            });

            // Update privacy settings
            await PrivacySettings.findOneAndUpdate(
                { user: userId },
                { [`consents.${type}`]: granted },
                { upsert: true }
            );

            return consent;
        } catch (error) {
            console.error('Consent logging failed:', error);
            throw error;
        }
    }

    async updateRetentionPolicy(dataType, retentionPeriod) {
        try {
            const policy = await DataRetention.findOneAndUpdate(
                { dataType },
                { retentionPeriod },
                { upsert: true, new: true }
            );

            // Apply new retention policy
            await this.applyRetentionPolicy(dataType);

            return policy;
        } catch (error) {
            console.error('Retention policy update failed:', error);
            throw error;
        }
    }

    async anonymizeData(userId) {
        try {
            const user = await User.findById(userId);
            
            // Anonymize user data
            user.email = `anonymized_${Date.now()}@deleted.user`;
            user.username = `deleted_user_${Date.now()}`;
            user.personalInfo = {};
            user.isAnonymized = true;
            
            await user.save();

            // Log anonymization
            await ConsentLog.create({
                user: userId,
                consentType: 'DATA_ANONYMIZATION',
                granted: true,
                timestamp: new Date()
            });

            return true;
        } catch (error) {
            console.error('Data anonymization failed:', error);
            throw error;
        }
    }

    async generatePrivacyReport(userId) {
        try {
            const user = await User.findById(userId);
            const privacySettings = await PrivacySettings.findOne({ user: userId });
            const consentLogs = await ConsentLog.find({ user: userId });
            const dataRequests = await DataRequest.find({ user: userId });

            return {
                user: {
                    id: user._id,
                    email: user.email,
                    createdAt: user.createdAt
                },
                privacySettings,
                consentHistory: consentLogs,
                dataRequests,
                generatedAt: new Date()
            };
        } catch (error) {
            console.error('Privacy report generation failed:', error);
            throw error;
        }
    }

    // Private helper methods
    async gatherUserData(userId) {
        // Implementation for gathering user data
    }

    async generateExportPackage(data) {
        // Implementation for generating export package
    }

    async scheduleDataDeletion(userId) {
        // Implementation for scheduling data deletion
    }

    async applyRetentionPolicy(dataType) {
        // Implementation for applying retention policy
    }
}

module.exports = new GDPRService();
