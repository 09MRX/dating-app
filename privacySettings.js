const express = require('express');
const router = express.Router();
const PrivacySettings = require('../models/PrivacySettings');
const auth = require('../middleware/auth');

// Create privacy settings
router.post('/', auth, async (req, res) => {
    try {
        // Check if settings already exist for this user
        let settings = await PrivacySettings.findOne({ user: req.user.id });
        
        if (settings) {
            return res.status(400).json({ message: 'Privacy settings already exist for this user' });
        }

        // Create new settings
        settings = new PrivacySettings({
            user: req.user.id,
            profileVisibility: req.body.profileVisibility || 'public',
            emailVisibility: req.body.emailVisibility || 'private',
            locationVisibility: req.body.locationVisibility || 'public',
            activityVisibility: req.body.activityVisibility || 'friends',
            searchable: req.body.searchable !== undefined ? req.body.searchable : true,
            showOnlineStatus: req.body.showOnlineStatus !== undefined ? req.body.showOnlineStatus : true,
            allowFriendRequests: req.body.allowFriendRequests !== undefined ? req.body.allowFriendRequests : true,
            allowMessages: req.body.allowMessages || 'everyone',
            dataSharing: {
                analytics: req.body.dataSharing?.analytics !== undefined ? req.body.dataSharing.analytics : true,
                recommendations: req.body.dataSharing?.recommendations !== undefined ? req.body.dataSharing.recommendations : true,
                thirdParty: req.body.dataSharing?.thirdParty !== undefined ? req.body.dataSharing.thirdParty : false
            },
            notificationPreferences: {
                email: {
                    securityAlerts: req.body.notificationPreferences?.email?.securityAlerts !== undefined 
                        ? req.body.notificationPreferences.email.securityAlerts : true,
                    loginAlerts: req.body.notificationPreferences?.email?.loginAlerts !== undefined 
                        ? req.body.notificationPreferences.email.loginAlerts : true,
                    updates: req.body.notificationPreferences?.email?.updates !== undefined 
                        ? req.body.notificationPreferences.email.updates : true,
                    marketing: req.body.notificationPreferences?.email?.marketing !== undefined 
                        ? req.body.notificationPreferences.email.marketing : false
                }
            }
        });

        await settings.save();
        res.status(201).json(settings);
    } catch (error) {
        console.error('Error creating privacy settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get privacy settings
router.get('/', auth, async (req, res) => {
    try {
        const settings = await PrivacySettings.findOne({ user: req.user.id });
        if (!settings) {
            return res.status(404).json({ message: 'Privacy settings not found' });
        }
        res.json(settings);
    } catch (error) {
        console.error('Error fetching privacy settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update privacy settings
router.put('/', auth, async (req, res) => {
    try {
        let settings = await PrivacySettings.findOne({ user: req.user.id });
        
        if (!settings) {
            return res.status(404).json({ message: 'Privacy settings not found' });
        }

        // Update fields
        const updateFields = {};
        
        if (req.body.profileVisibility) updateFields.profileVisibility = req.body.profileVisibility;
        if (req.body.emailVisibility) updateFields.emailVisibility = req.body.emailVisibility;
        if (req.body.locationVisibility) updateFields.locationVisibility = req.body.locationVisibility;
        if (req.body.activityVisibility) updateFields.activityVisibility = req.body.activityVisibility;
        if (req.body.searchable !== undefined) updateFields.searchable = req.body.searchable;
        if (req.body.showOnlineStatus !== undefined) updateFields.showOnlineStatus = req.body.showOnlineStatus;
        if (req.body.allowFriendRequests !== undefined) updateFields.allowFriendRequests = req.body.allowFriendRequests;
        if (req.body.allowMessages) updateFields.allowMessages = req.body.allowMessages;
        
        if (req.body.dataSharing) {
            updateFields.dataSharing = {
                ...settings.dataSharing,
                ...req.body.dataSharing
            };
        }

        if (req.body.notificationPreferences?.email) {
            updateFields['notificationPreferences.email'] = {
                ...settings.notificationPreferences.email,
                ...req.body.notificationPreferences.email
            };
        }

        settings = await PrivacySettings.findOneAndUpdate(
            { user: req.user.id },
            { $set: updateFields },
            { new: true }
        );

        res.json(settings);
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
