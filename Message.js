const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    match: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Update last interaction in Match when a new message is sent
messageSchema.post('save', async function(doc) {
    try {
        await mongoose.model('Match').findByIdAndUpdate(
            doc.match,
            { lastInteraction: Date.now() }
        );
    } catch (error) {
        console.error('Error updating match last interaction:', error);
    }
});

module.exports = mongoose.model('Message', messageSchema);
