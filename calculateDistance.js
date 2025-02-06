/**
 * Calculate distance between two points using MongoDB's $nearSphere
 * @param {Object} userLocation - Location of the first user
 * @param {Object} otherUserLocation - Location of the second user
 * @returns {number} Distance in kilometers
 */
function calculateDistance(userLocation, otherUserLocation) {
    try {
        // Validate input locations
        if (!userLocation || !otherUserLocation) {
            throw new Error('Invalid location data');
        }

        // Use MongoDB's geospatial query to calculate distance
        const distance = userLocation.coordinates[1] * Math.PI / 180;
        const otherDistance = otherUserLocation.coordinates[1] * Math.PI / 180;
        const theta = userLocation.coordinates[0] * Math.PI / 180 - otherUserLocation.coordinates[0] * Math.PI / 180;
        
        let dist = Math.sin(distance) * Math.sin(otherDistance) +
                   Math.cos(distance) * Math.cos(otherDistance) *
                   Math.cos(theta);
        
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515; // Miles
        dist = dist * 1.609344; // Convert to kilometers

        return Math.round(dist * 100) / 100; // Round to 2 decimal places
    } catch (error) {
        console.error('Distance calculation error:', error);
        return null;
    }
}

/**
 * Find nearby users within a specified radius
 * @param {Object} user - Current user
 * @param {number} maxDistance - Maximum distance in kilometers
 * @param {Object} User - Mongoose User model
 * @returns {Array} List of nearby users
 */
async function findNearbyUsers(user, maxDistance, User) {
    try {
        // Convert max distance to meters
        const maxDistanceMeters = maxDistance * 1000;

        const nearbyUsers = await User.find({
            _id: { $ne: user._id }, // Exclude current user
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: user.location.coordinates
                    },
                    $maxDistance: maxDistanceMeters
                }
            }
        });

        return nearbyUsers;
    } catch (error) {
        console.error('Find nearby users error:', error);
        return [];
    }
}

module.exports = {
    calculateDistance,
    findNearbyUsers
};
