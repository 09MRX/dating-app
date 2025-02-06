const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect('mongodb://127.0.0.1:27017/test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connection successful!');
        console.log('Connection details:', mongoose.connection.host, mongoose.connection.port);
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    }
}

testConnection();
