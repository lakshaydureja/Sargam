// Import required modules
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://sargam:Sargam1234@cluster0.0bqipfb.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to the database');
        return client;

    } catch (error) {
        console.error('Error connecting to the database:', error.message);
    }
}
// Call this function to connect to the database
// connectToDatabase();



// Define the fetchUserData function
async function fetchUserData() {
    const databaseName = 'sargam01';
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        console.log('Connected to the database');

        const database = client.db(databaseName);
        const usersCollection = database.collection('users');

        // Find all documents in the "users" collection
        const allUsers = await usersCollection.find({}).toArray();
        return allUsers;
    } finally {
        // Close the database connection when done
        // await client.close();
        // console.log('Connection to the database closed');
    }
}

// Close the MongoDB connection when the Node.js process ends
process.on('SIGINT', () => {
    client.close().then(() => {
        console.log('MongoDB connection closed due to application termination');
        process.exit(0);
    });
});

// Export the fetchUserData function
module.exports = {
    fetchUserData,
    connectToDatabase,
    // Add more functions as needed
};