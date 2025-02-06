const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gdprCompliance = require('../middleware/gdprCompliance');
const GDPRService = require('../services/GDPRService');
const ConsentLog = require('../models/ConsentLog');
const DataRequest = require('../models/DataRequest');

// Get user's consents
router.get('/consents', auth, async (req, res) => {
    try {
        const consents = await ConsentLog.find({ 
            user: req.user.id,
            granted: true,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } }
            ]
        });
        
        // Format consents into a more user-friendly structure
        const formattedConsents = consents.reduce((acc, consent) => {
            acc[consent.consentType] = consent.granted;
            return acc;
        }, {});

        res.json(formattedConsents);
    } catch (error) {
        console.error('Error fetching consents:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user's consent
router.post('/consents', auth, async (req, res) => {
    try {
        const { consentType, granted } = req.body;
        const consent = await GDPRService.logConsent(req.user.id, consentType, granted);
        res.json(consent);
    } catch (error) {
        console.error('Error updating consent:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get consent history
router.get('/consents/history', auth, async (req, res) => {
    try {
        const history = await ConsentLog.find({ user: req.user.id })
            .sort({ timestamp: -1 })
            .select('-metadata.ipAddress');
        res.json(history);
    } catch (error) {
        console.error('Error fetching consent history:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Request data export
router.post('/data-requests', auth, async (req, res) => {
    try {
        const { type } = req.body;
        let request;

        if (type === 'EXPORT') {
            request = await GDPRService.requestDataExport(req.user.id);
        } else if (type === 'DELETION') {
            request = await GDPRService.requestDataDeletion(req.user.id);
        } else {
            return res.status(400).json({ message: 'Invalid request type' });
        }

        res.status(201).json(request);
    } catch (error) {
        console.error('Error creating data request:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get data requests
router.get('/data-requests', auth, async (req, res) => {
    try {
        const requests = await DataRequest.find({ user: req.user.id })
            .sort({ requestedAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error('Error fetching data requests:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download data export
router.get('/data-requests/:requestId/download', auth, async (req, res) => {
    try {
        const request = await DataRequest.findOne({
            _id: req.params.requestId,
            user: req.user.id,
            type: 'EXPORT',
            status: 'COMPLETED'
        });

        if (!request) {
            return res.status(404).json({ message: 'Export not found or not ready' });
        }

        if (!request.downloadUrl) {
            return res.status(400).json({ message: 'Export file not available' });
        }

        // Send the file
        res.download(request.downloadUrl);
    } catch (error) {
        console.error('Error downloading export:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Generate privacy report
router.get('/privacy-report', auth, async (req, res) => {
    try {
        const report = await GDPRService.generatePrivacyReport(req.user.id);
        res.json(report);
    } catch (error) {
        console.error('Error generating privacy report:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
