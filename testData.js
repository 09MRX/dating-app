const bcrypt = require('bcryptjs');
const User = require('../models/User');

const testUsers = [
    {
        username: "sarah_istanbul",
        email: "sarah@test.com",
        password: "test123",
        age: 25,
        gender: "female",
        bio: "Love exploring Istanbul's hidden gems",
        interests: ["travel", "photography", "coffee"],
        location: {
            type: "Point",
            coordinates: [28.9784, 41.0082], // Istanbul coordinates
            city: "Istanbul",
            country: "Turkey"
        }
    },
    {
        username: "alex_ankara",
        email: "alex@test.com",
        password: "test123",
        age: 28,
        gender: "male",
        bio: "Software developer, coffee enthusiast",
        interests: ["coding", "music", "hiking"],
        location: {
            type: "Point",
            coordinates: [32.8597, 39.9334], // Ankara coordinates
            city: "Ankara",
            country: "Turkey"
        }
    }
];

async function createTestUsers() {
    try {
        // Clear existing test users
        await User.deleteMany({
            email: { $in: testUsers.map(user => user.email) }
        });

        // Create new test users
        const processedUsers = [];
        for (const user of testUsers) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);
            processedUsers.push({
                ...user,
                password: hashedPassword
            });
        }

        // Save to database
        const savedUsers = await User.insertMany(processedUsers);
        console.log('Test users created:', savedUsers.map(u => u.username));
        return savedUsers;
    } catch (error) {
        console.error('Error creating test users:', error);
        throw error;
    }
}

module.exports = { createTestUsers };
