const ConsentLog = require('../models/ConsentLog');
const PrivacySettings = require('../models/PrivacySettings');

const gdprCompliance = {
    // Middleware to check if user has given necessary consents
    requireConsent: (consentTypes) => {
        return async (req, res, next) => {
            try {
                const userId = req.user.id;
                const consents = await ConsentLog.find({
                    user: userId,
                    consentType: { $in: consentTypes },
                    granted: true,
                    $or: [
                        { expiresAt: { $exists: false } },
                        { expiresAt: { $gt: new Date() } }
                    ]
                });

                const missingConsents = consentTypes.filter(type => 
                    !consents.some(consent => consent.consentType === type)
                );

                if (missingConsents.length > 0) {
                    return res.status(403).json({
                        message: 'Required consents not given',
                        requiredConsents: missingConsents
                    });
                }

                next();
            } catch (error) {
                console.error('Consent verification failed:', error);
                res.status(500).json({ message: 'Error verifying consent' });
            }
        };
    },

    // Middleware to log data access
    logDataAccess: (dataType) => {
        return async (req, res, next) => {
            const originalSend = res.send;
            res.send = function (data) {
                // Log the access after response is sent
                setImmediate(async () => {
                    try {
                        await new ConsentLog({
                            user: req.user.id,
                            consentType: 'DATA_ACCESS',
                            granted: true,
                            metadata: {
                                dataType,
                                accessType: req.method,
                                ipAddress: req.ip,
                                userAgent: req.headers['user-agent']
                            }
                        }).save();
                    } catch (error) {
                        console.error('Failed to log data access:', error);
                    }
                });

                originalSend.call(this, data);
            };
            next();
        };
    },

    // Middleware to enforce data minimization
    minimizeData: (fields) => {
        return async (req, res, next) => {
            try {
                const privacySettings = await PrivacySettings.findOne({ user: req.user.id });
                
                // Remove fields based on privacy settings
                fields.forEach(field => {
                    if (privacySettings && !privacySettings[`${field}Visibility`]) {
                        if (req.body[field]) delete req.body[field];
                    }
                });

                next();
            } catch (error) {
                console.error('Data minimization failed:', error);
                res.status(500).json({ message: 'Error applying data minimization' });
            }
        };
    },

    // Middleware to check data retention periods
    checkRetention: (dataType) => {
        return async (req, res, next) => {
            try {
                const DataRetention = require('../models/DataRetention');
                const policy = await DataRetention.findOne({ dataType });

                if (!policy) {
                    console.warn(`No retention policy found for ${dataType}`);
                    return next();
                }

                // Add retention metadata to the request
                req.retentionPolicy = policy;
                
                // If this is a write operation, set retention period
                if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                    const retentionEnd = policy.calculateRetentionEnd(new Date());
                    req.body.retentionPeriod = {
                        end: retentionEnd,
                        policy: policy._id
                    };
                }

                next();
            } catch (error) {
                console.error('Retention check failed:', error);
                res.status(500).json({ message: 'Error checking data retention' });
            }
        };
    },

    // Middleware to handle right to be forgotten
    handleDeletion: () => {
        return async (req, res, next) => {
            if (req.query.deletion_requested === 'true') {
                try {
                    const GDPRService = require('../services/GDPRService');
                    await GDPRService.requestDataDeletion(req.user.id);
                    return res.status(202).json({
                        message: 'Deletion request received and being processed'
                    });
                } catch (error) {
                    console.error('Deletion request failed:', error);
                    return res.status(500).json({
                        message: 'Error processing deletion request'
                    });
                }
            }
            next();
        };
    },

    // Middleware to anonymize sensitive data in logs
    anonymizeLogs: () => {
        return (req, res, next) => {
            // Anonymize sensitive data in request
            if (req.body) {
                const sensitiveFields = ['password', 'credit_card', 'ssn'];
                sensitiveFields.forEach(field => {
                    if (req.body[field]) {
                        req.body[field] = '[REDACTED]';
                    }
                });
            }

            // Anonymize IP address
            req.anonymizedIp = req.ip.replace(/[\d.]+$/, 'xxx');

            next();
        };
    }
};

module.exports = gdprCompliance;
