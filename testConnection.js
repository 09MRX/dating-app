require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const PrivacySettings = require('./models/PrivacySettings');
const ConsentLog = require('./models/ConsentLog');
const DataRequest = require('./models/DataRequest');
const DataRetention = require('./models/DataRetention');
const SocialLink = require('./models/SocialLink');

async function testConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully connected to MongoDB!');
        
        // Create a test user
        const user = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedpassword123'
        });
        await user.save();
        console.log('Created test user:', user._id);

        // Create privacy settings for the user
        const privacySettings = new PrivacySettings({
            user: user._id,
            profileVisibility: 'public',
            emailVisibility: 'private',
            dataSharing: {
                analytics: true,
                recommendations: true,
                thirdParty: false
            }
        });
        await privacySettings.save();
        console.log('Created privacy settings');

        // Log some consents
        const consent = new ConsentLog({
            user: user._id,
            consentType: 'MARKETING_EMAIL',
            granted: true,
            version: '1.0'
        });
        await consent.save();
        console.log('Logged consent');

        // Create a data export request
        const dataRequest = new DataRequest({
            user: user._id,
            type: 'EXPORT',
            status: 'PENDING'
        });
        await dataRequest.save();
        console.log('Created data request');

        // Create a data retention policy
        const retentionPolicy = new DataRetention({
            dataType: 'USER_PROFILE',
            retentionPeriod: {
                value: 2,
                unit: 'YEARS'
            },
            policy: {
                version: '1.0',
                legalBasis: 'CONSENT'
            }
        });
        await retentionPolicy.save();
        console.log('Created retention policy');

        // Create a social link
        const socialLink = new SocialLink({
            user: user._id,
            platform: 'github',
            platformUserId: 'testuser123',
            accessToken: 'test_token',
            status: 'active'
        });
        await socialLink.save();
        console.log('Created social link');

        // Test queries
        console.log('\nTesting queries:');
        
        const userPrivacySettings = await PrivacySettings.findOne({ user: user._id });
        console.log('Found privacy settings:', userPrivacySettings.profileVisibility);

        const userConsents = await ConsentLog.find({ user: user._id });
        console.log('Found consents:', userConsents.length);

        const pendingRequests = await DataRequest.getPendingRequests();
        console.log('Found pending requests:', pendingRequests.length);

        const userSocialLinks = await SocialLink.find({ user: user._id });
        console.log('Found social links:', userSocialLinks.length);

        // Clean up
        console.log('\nCleaning up test data...');
        await User.deleteOne({ _id: user._id });
        await PrivacySettings.deleteOne({ user: user._id });
        await ConsentLog.deleteOne({ user: user._id });
        await DataRequest.deleteOne({ user: user._id });
        await DataRetention.deleteOne({ dataType: 'USER_PROFILE' });
        await SocialLink.deleteOne({ user: user._id });
        console.log('Cleaned up all test data');
        
        await mongoose.connection.close();
        console.log('Connection closed successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

testConnection();
