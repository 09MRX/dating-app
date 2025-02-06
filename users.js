const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { calculateDistance } = require('../utils/distance');

// Create test users route (no auth required)
router.post('/create-test-users', async (req, res) => {
    try {
        const { createTestUsers } = require('../utils/testData');
        await createTestUsers();
        res.json({ message: 'Test users created successfully' });
    } catch (error) {
        console.error('Error creating test users:', error);
        res.status(500).json({ error: 'Error creating test users' });
    }
});

// All routes below this line require authentication
router.use(auth);

// Get all users (with optional filtering and distance calculation)
router.get('/', async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const filters = {
            _id: { $ne: req.user.id }, // Exclude current user
            gender: req.query.gender || { $ne: currentUser.gender } // Show opposite gender by default
        };
        
        if (req.query.minAge) filters.age = { $gte: parseInt(req.query.minAge) };
        if (req.query.maxAge) {
            filters.age = { ...filters.age, $lte: parseInt(req.query.maxAge) };
        }

        // Get user's coordinates
        const [userLon, userLat] = currentUser.location.coordinates;

        // Find users within max distance (if specified)
        if (req.query.maxDistance) {
            const maxDistance = parseInt(req.query.maxDistance);
            filters.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [userLon, userLat]
                    },
                    $maxDistance: maxDistance * 1000 // Convert km to meters
                }
            };
        }

        const users = await User.find(filters)
            .select('-password')
            .limit(50);

        // Calculate and add distance for each user
        const usersWithDistance = users.map(user => {
            const [lon, lat] = user.location.coordinates;
            const distance = calculateDistance(userLat, userLon, lat, lon);
            return {
                ...user.toObject(),
                distance: distance
            };
        });

        // Sort by distance if requested
        if (req.query.sortByDistance) {
            usersWithDistance.sort((a, b) => a.distance - b.distance);
        }

        res.json(usersWithDistance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        // Remove sensitive fields that shouldn't be updated directly
        delete updates.password;
        delete updates.email;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update user location
router.patch('/location', async (req, res) => {
    try {
        const { coordinates } = req.body;
        
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
            return res.status(400).json({ message: 'Invalid coordinates format' });
        }

        const [longitude, latitude] = coordinates;

        // Update user's location
        await User.findByIdAndUpdate(req.user.id, {
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            }
        });

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
