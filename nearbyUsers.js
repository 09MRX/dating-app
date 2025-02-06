const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { calculateDistance, findNearbyUsers } = require('../utils/calculateDistance');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route   GET /api/users/nearby
 * @desc    Find nearby users within a specified radius
 * @access  Private
 */
router.get('/nearby', authMiddleware, async (req, res) => {
    try {
        const { 
            maxDistance = 50,  // Default 50 km
            minAge,            // Optional minimum age filter
            maxAge,            // Optional maximum age filter
            interests          // Optional interests filter
        } = req.query;

        // Get current user's full profile
        const currentUser = await User.findById(req.user.id);

        if (!currentUser || !currentUser.location || !currentUser.location.coordinates) {
            return res.status(400).json({ 
                message: 'User location not set. Please update your profile location.' 
            });
        }

        // Build filter query
        const filterQuery = {
            _id: { $ne: currentUser._id }, // Exclude current user
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: currentUser.location.coordinates
                    },
                    $maxDistance: maxDistance * 1000 // Convert km to meters
                }
            }
        };

        // Add optional age filter
        if (minAge && maxAge) {
            filterQuery.age = { $gte: minAge, $lte: maxAge };
        }

        // Add optional interests filter
        if (interests) {
            const interestArray = interests.split(',');
            filterQuery.interests = { $in: interestArray };
        }

        // Find nearby users
        const nearbyUsers = await User.find(filterQuery)
            .select('-password -twoFactorSecret -emailVerificationToken');

        // Enrich nearby users with distance
        const enrichedNearbyUsers = nearbyUsers.map(user => {
            const distance = calculateDistance(
                currentUser.location, 
                user.location
            );

            return {
                ...user.toObject(),
                distance: distance
            };
        });

        // Sort by distance
        enrichedNearbyUsers.sort((a, b) => a.distance - b.distance);

        res.json({
            count: enrichedNearbyUsers.length,
            users: enrichedNearbyUsers
        });

    } catch (error) {
        console.error('Nearby users error:', error);
        res.status(500).json({ 
            message: 'Server error finding nearby users', 
            error: error.message 
        });
    }
});

/**
 * @route   POST /api/users/update-location
 * @desc    Update user's current location
 * @access  Private
 */
router.post('/update-location', authMiddleware, async (req, res) => {
    try {
        const { longitude, latitude, city, country } = req.body;

        if (!longitude || !latitude) {
            return res.status(400).json({ 
                message: 'Longitude and latitude are required' 
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                    city: city || '',
                    country: country || ''
                }
            }, 
            { new: true }
        );

        res.json({
            message: 'Location updated successfully',
            location: updatedUser.location
        });

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ 
            message: 'Server error updating location', 
            error: error.message 
        });
    }
});

module.exports = router;
