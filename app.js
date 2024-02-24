const PORT = process.env.PORT || 3000;

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require('crypto');

const app = express();

const session = require('express-session');
const cookieParser = require('cookie-parser');
const http = require('http')
const https = require('https')
const path = require('path')
const fs = require('fs')
const qs = require('querystring')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const Razorpay = require('razorpay');

const uri = 'mongodb+srv://sargam:Sargam1234@cluster0.0bqipfb.mongodb.net/?retryWrites=true&w=majority';
const client = new MongoClient(uri);
const { fetchUserData, connectToDatabase } = require('./modules/mongo');
const { log } = require("console");

//const url = "http://localhost:3000";
const db1 = 'sargam01';
const authCollection = 'auths';
const dataCollection1 = 'users';
var isAdmin = false;

// Hardcoded admin credentials
//DON'T CHANGE These hardcoded credentials because database also have same values in it
//if mismatch occur then site will crash.
const adminCredentials = {
    email: 'admin@sargam.com',
    password: 'Dhruv@1234'
};

// Use cookie-parser middleware
app.use(cookieParser());

// Use express-session middleware
app.use(session({
    secret: 'unique key space dont change',
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


const razorpayInstance = new Razorpay({

    // Replace with your production key_id 
    key_id: "rzp_test_pInvU1Z729a57F",

    // Replace with your production key_secret 
    key_secret: "TMhb6f3PvqLCJBlJ1sjetqMv"
});







app.get("/", function (req, res) {
    const isAuthenticated = req.session.userId ? true : false;
    // Render the homepage and pass the isAuthenticated status
    res.render('index', { isAuthenticated, isAdmin });

})

app.get("/onboard", function (req, res) {
    const isAuthenticated = req.session.userId ? true : false;
    if (isAuthenticated) {
        // res.render('dashboard', { isAuthenticated });
        res.redirect('/');

    } else {
        res.render('signup', { isAuthenticated, isAdmin });
    }
})

app.get("/onboard2", function (req, res) {

    const isAuthenticated = req.session.userId ? true : false;
    if (isAuthenticated) {
        res.redirect('/');
    } else {

        res.render('login', { isAuthenticated, isAdmin });
    }
})

app.post('/register', async (req, res) => {
    // const phoneNumber = req.body.phoneNumber;
    const email = req.body.email;
    const password = req.body.password;
    const isAuthenticated = req.session.userId ? true : false;


    try {
        const db = client.db(db1);
        const usersCollection = db.collection(authCollection);

        // Check if the email is already registered
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {

            if (email != adminCredentials.email) {
                // If the email is already registered, update the existing entry
                const hashedPassword = await bcrypt.hash(password, 10);
                const result = await usersCollection.updateOne(
                    { email },
                    { $set: { password: hashedPassword } }
                );

                const userId = existingUser._id.toString();
                // Store user ID in a session
                req.session.userId = userId;
                // console.log(userId + " in /sign");

                // Redirect to dashboard
                res.redirect('/dashboard');

            } else {
                const pageTitle = 'ERROR';
                const pageData = 'ONLY 1 ADMIN ACCOUNT IS ALLOWED';

                res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin });
                console.log("trying to change admin pass");
            }

        } else {
            // If the email is not registered, create a new entry
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await usersCollection.insertOne({
                email,
                password: hashedPassword,
            });

            const userId = result.insertedId.toString();
            // Store user ID in a session
            req.session.userId = userId;
            // console.log(userId + " in /sign");

            // Redirect to dashboard
            res.redirect('/dashboard');
        }

    } catch (error) {
        const pageTitle = 'Error registering user';
        const pageData = 'Try again.';

        res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin });
        console.error('Error registering user:', error);
    }
});

app.post("/login", function (req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const isAuthenticated = req.session.userId ? true : false;

    (async () => {
        try {
            const db = client.db(db1);
            const usersCollection = db.collection(authCollection);
            // Find the user by email
            const user = await usersCollection.findOne({ email });



            // Verify the password
            if (user && await bcrypt.compare(password, user.password)) {


                const userId = user._id.toString();
                // Store user ID in a cookie or session
                req.session.userId = userId;



                // Generate a token
                const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });


                if (email === adminCredentials.email && password === adminCredentials.password) {
                    // Redirect to admin page
                    isAdmin = true;
                    res.redirect('/admin');
                } else {
                    // Redirect to dashboard
                    res.redirect('/dashboard');
                }

            } else {
                const pageTitle = 'ERROR 401';
                const pageData = 'INVALID CREDENTIALS : USER NOT FOUND';
                res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin })
            }
        } catch (error) {
            const pageTitle = 'Internal Server Error';
            const pageData = 'we are working on it.';

            res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin })
            console.error('Error during login:', error);
        }

    })();
});

app.get('/logout', (req, res) => {
    // Destroy the session to log out the user
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        isAdmin = false;
        // Redirect the user to the login page or any other desired page after logout
        res.redirect('/'); // Redirect to login page
    });
});

app.get("/dashboard", async (req, res) => {

    const isAuthenticated = req.session.userId ? true : false;
    if (isAuthenticated) {
        // res.render('dashboard', { isAuthenticated });



        const userId = req.session.userId; // Retrieve user ID from the session
        // console.log(userId +"in /dash");
        //now check if user id exist in db then show status other wise show form

        try {
            const db = client.db(db1);
            const dataCollection = db.collection(dataCollection1);

            // Find documents in dataCollection where userId matches
            const userInfo0 = await dataCollection.find({ userId }).toArray();

            if (userInfo0.length === 0) {
                // console.log(userInfo);
                console.log('User information not found or is empty.');

                const userInfo = [
                    {
                        orderId: 'Oid_xxxxxxxxx',
                        fullName: 'xxxx',
                        email: 'xxxxxxxxx@gmail.com',
                        trackType: 'x',
                        description: 'xxxxxxxxxxxxxxxx',
                        whatsappNumber: 'xxxxxxxxxx',
                        feePaid: false,
                        timeline: 'xxxxxxx'
                    }
                ]

                res.render('dashboard', { userInfo, isAuthenticated, isAdmin });

            } else {
                const userInfo = [...userInfo0];
                console.log("user data found");
                // Render the retrieved data or perform other actions
                res.render('dashboard', { userInfo, isAuthenticated, isAdmin });
            }

        } catch (error) {
            console.error('Error retrieving data:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }

    } else {
        res.render('login', { isAuthenticated, isAdmin });
    }
});

app.get("/admin", async (req, res) => {

    const isAuthenticated = req.session.userId ? true : false;
    if (isAuthenticated) {
        // res.render('dashboard', { isAuthenticated });



        try {
            const userData = await fetchUserData(); // Implement the fetchUserData function

            res.render('admin', { userData, isAuthenticated, isAdmin });
        } catch (error) {
            const pageTitle = 'Internal Server Error';
            const pageData = 'Error fetching user data';

            res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin })
            console.error('Error fetching user data:', error.message);
        }

    } else {
        res.render('login', { isAuthenticated, isAdmin });
    }
});

app.post('/updateUserStatus', async (req, res) => {
    const { userId, newStatus } = req.body;

    try {
        const db = client.db(db1);
        const dataCollection = db.collection(dataCollection1);

        // Update the user status in the database
        const user = await dataCollection.findOneAndUpdate({ userId }, { $set: { timeline: newStatus } }, { new: true });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User status updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/deleteUser/:userId', async (req, res) => {
    const userIdToDelete = req.params.userId;

    try {
        const db = client.db(db1);
        const dataCollection = db.collection(dataCollection1);


        // Perform the delete operation in the database
        const result = await dataCollection.deleteOne({ userId: userIdToDelete });

        if (result.deletedCount === 1) {
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//***payment part below
app.post('/submitPaymentData', async (req, res) => {
    const isAuthenticated = req.session.userId ? true : false;

    var { fullName, email, trackType, description, whatsappNumber } = req.body;
    description = convertToPlainText(description);
    var amount = 0;
    switch (trackType) {
        case "1":
            amount = 180000
            break;
        case "2":
            amount = 249900
            break;
        case "3":
            amount = 499900
            break;
    }

    const orderId = 'Oid_' + new Date().getTime()
    const feePaid = false;
    const timeline = "To be updated";
    const userId = req.session.userId;

    try {
        const db = client.db(db1);
        const dataCollection = db.collection(dataCollection1);

        const result = await dataCollection.insertOne({
            userId,
            orderId,
            fullName,
            email,
            trackType,
            description,
            whatsappNumber,
            feePaid,
            timeline,
        });



        razorpayInstance.orders.create({
            amount: amount,
            currency: "INR",
            receipt: orderId,
            notes: {
                whatsapp_number: whatsappNumber,
                name: fullName
            }
        }, async (err, order) => {
            if (!err) {


                await dataCollection.updateOne(
                    { orderId: orderId },
                    { $set: { orderId: order.id } }
                );

                res.status(200).send({
                    success: true,
                    msg: 'Order Created',
                    order_id: order.id,
                    amount: amount,
                    key_id: razorpayInstance.key_id,
                    product_name: "Sargam",
                    contact: whatsappNumber,
                    name: fullName,
                    email: email
                });

            } else {
                res.status(400).send({ success: false, msg: 'Something went wrong!' });
            }
        })



    } catch (error) {
        console.error('Error registering user:', error);
        const pageTitle = 'ERROR';
        const pageData = 'Error registering user. Contact us for help';
        res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin });

    }

});


app.post("/success", async (req, res) => {
    // Handle the success notification from the client
    const { orderId, paymentId, signature } = req.body;

    // Use your key secret obtained from the Razorpay Dashboard
    const keySecret = razorpayInstance.key_secret;

    try {
        // Retrieve order details from the database using the Razorpay orderId
        const db = client.db(db1);
        const dataCollection = db.collection(dataCollection1);

        const orderDetails = await dataCollection.findOne({ orderId: orderId });

        if (orderDetails) {
            // Verify the signature
            const generatedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(orderId + "|" + paymentId)
                .digest('hex');

            // Compare the generated signature with the one received from the client
            if (generatedSignature === signature) {
                // Signature is valid, proceed with updating feePaid status
                console.log('Signature verification successful');

                // Update MongoDB user document to set 'feePaid' to true
                await dataCollection.updateOne(
                    { orderId: orderId },
                    { $set: { feePaid: true } }
                );

                // Send a success response to the client
                res.json({ success: true, message: "Success notification received" });
            } else {
                // Signature is invalid, handle accordingly
                console.error('Signature verification failed');
                res.status(400).json({ success: false, message: "Invalid signature" });
            }
        } else {
            console.log('Order details not found');
            res.status(404).json({ success: false, message: "Order details not found" });
        }

    } catch (error) {
        console.error('Error processing success notification:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
app.get("/error", (req, res) => {
    const pageTitle = 'Internal Server Error';
    const pageData = 'please contact us on support';

    res.render('error', { pageTitle, pageData, isAuthenticated, isAdmin });
});


//static pages
app.get("/staticPP", function (req, res) {
    const isAuthenticated = req.session.userId ? true : false;
    res.render('./static/privacyPolicy', { isAuthenticated, isAdmin });
})
app.get("/staticTC", function (req, res) {
    const isAuthenticated = req.session.userId ? true : false;
    res.render('./static/terms', { isAuthenticated, isAdmin });
})
app.get("/staticCP", function (req, res) {
    const isAuthenticated = req.session.userId ? true : false;
    res.render('./static/cancellationPolicy', { isAuthenticated, isAdmin });
})



// functions
function convertToPlainText(inputText) {
    // Convert to string and trim whitespace
    let plainText = String(inputText);

    // Remove control characters and non-printable characters
    plainText = plainText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // Replace newlines and multiple spaces with a single space
    plainText = plainText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

    // Replace double quotes with single quotes
    plainText = plainText.replace(/"/g, "'");

    return plainText;
}

async function startServer() {
    try {
        await connectToDatabase();
        console.log('Connected to MongoDB');

        // Start the Express server
        app.listen(PORT, () => {
            console.log('Server is running on port 3000');
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}


startServer();



//This Node.js application was crafted by Lakshay Dureja
//GitHub: github.com/lakshaydureja
//Email: lakshaydureja7@gmail.com