const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// All routes below this line require authentication
router.use(auth);

// Get all matches for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const matches = await Match.find({
            users: req.params.userId,
            status: 'accepted'
        })
        .populate('users', 'username profilePicture')
        .sort({ lastInteraction: -1 });
        
        res.json(matches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new match request
router.post('/', async (req, res) => {
    try {
        const { initiatorId, recipientId } = req.body;

        // Check if match already exists
        const existingMatch = await Match.findOne({
            users: { $all: [initiatorId, recipientId] }
        });

        if (existingMatch) {
            return res.status(400).json({ message: 'Match already exists' });
        }

        const newMatch = new Match({
            users: [initiatorId, recipientId],
            initiator: initiatorId,
            recipient: recipientId
        });

        const savedMatch = await newMatch.save();
        res.status(201).json(savedMatch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update match status (accept/reject)
router.put('/:matchId/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const match = await Match.findByIdAndUpdate(
            req.params.matchId,
            { status },
            { new: true }
        ).populate('users', 'username profilePicture');

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        res.json(match);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get pending matches for a user
router.get('/pending/:userId', async (req, res) => {
    try {
        const pendingMatches = await Match.find({
            recipient: req.params.userId,
            status: 'pending'
        })
        .populate('initiator', 'username profilePicture');
        
        res.json(pendingMatches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
