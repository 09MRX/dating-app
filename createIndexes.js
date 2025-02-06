const mongoose = require('mongoose');
const User = require('../models/User');

async function createIndexes() {
    try {
        // Create geospatial index for location
        await User.collection.createIndex({ 'location.coordinates': '2dsphere' });
        console.log('Geospatial index created successfully');

        // Optional: Create other indexes if needed
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ username: 1 }, { unique: true });
        
        console.log('All indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

module.exports = createIndexes;
