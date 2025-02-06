const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// All routes below this line require authentication
router.use(auth);

// Get messages for a specific match
router.get('/match/:matchId', async (req, res) => {
    try {
        const messages = await Message.find({ match: req.params.matchId })
            .populate('sender', 'username profilePicture')
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Send a new message
router.post('/', async (req, res) => {
    try {
        const { matchId, senderId, content } = req.body;

        // Verify match exists and is accepted
        const match = await Match.findOne({
            _id: matchId,
            status: 'accepted',
            users: senderId
        });

        if (!match) {
            return res.status(404).json({ message: 'Match not found or not accepted' });
        }

        const newMessage = new Message({
            match: matchId,
            sender: senderId,
            content
        });

        const savedMessage = await newMessage.save();
        const populatedMessage = await Message.findById(savedMessage._id)
            .populate('sender', 'username profilePicture');

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Mark messages as read
router.put('/read', async (req, res) => {
    try {
        const { matchId, userId } = req.body;

        const messages = await Message.updateMany(
            {
                match: matchId,
                sender: { $ne: userId },
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );

        res.json({ message: 'Messages marked as read', updatedCount: messages.modifiedCount });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get unread message count for a user
router.get('/unread/:userId', async (req, res) => {
    try {
        const matches = await Match.find({
            users: req.params.userId,
            status: 'accepted'
        });

        const matchIds = matches.map(match => match._id);

        const unreadCount = await Message.countDocuments({
            match: { $in: matchIds },
            sender: { $ne: req.params.userId },
            read: false
        });

        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
