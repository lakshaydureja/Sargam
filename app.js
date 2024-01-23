const PORT = process.env.PORT || 3000;

const express = require("express");
const bodyParser = require("body-parser");
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

const uri = 'mongodb+srv://sargam:Sargam1234@cluster0.0bqipfb.mongodb.net/?retryWrites=true&w=majority';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const url = "http://localhost:3000";
const db1 = 'sargam01';
const authCollection = 'auths';
const dataCollection1 = 'users';

// Hardcoded admin credentials
const adminCredentials = {
    email: 'admin@sargam.com',
    password: 'Dhruv@123'
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


// Import paytm checksum utility
const PaytmChecksum = require('./config/cheksum')
const PaytmConfig = require('./config/config')
const { fetchUserData, connectToDatabase } = require('./modules/mongo');






app.get("/", function (req, res) {
    res.render('index');
})

app.get("/onboard", function (req, res) {
    res.render('signup');
})

app.get("/onboard2", function (req, res) {
    const successMessage = req.query.success || '';
    res.render('login', { successMessage });
})

app.post('/register', async (req, res) => {
    const phoneNumber = req.body.phoneNumber;
    const email = req.body.email;
    const password = req.body.password;

    try {
        const db = client.db(db1);
        const usersCollection = db.collection(authCollection);

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await usersCollection.insertOne({
            phoneNumber,
            email,
            password: hashedPassword,
        });


        const successMessage = 'Account created successfully. Now you can log in.';
        res.redirect(`/onboard2?success=${encodeURIComponent(successMessage)}`);

    } catch (error) {
        const pageTitle = 'Error registering user';
        const pageData = 'try again.';

        res.render('error', { pageTitle, pageData })
        console.error('Error registering user:', error);
    }


});

app.post("/login", function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    (async () => {
        try {
            const db = client.db(db1);
            const usersCollection = db.collection(authCollection);
            // Find the user by email
            const user = await usersCollection.findOne({ email });

            const userId = user._id.toString();
            // Store user ID in a cookie or session
            req.session.userId = userId;

            // Verify the password
            if (user && await bcrypt.compare(password, user.password)) {

                // Generate a token
                const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });


                if (email === adminCredentials.email && password === adminCredentials.password) {
                    // Redirect to admin page
                    res.redirect('/admin');
                } else {
                    // Redirect to dashboard
                    res.redirect('/dashboard');
                }

            } else {
                const pageTitle = 'ERROR 401';
                const pageData = 'INVALID CREDENTIALS : USER NOT FOUND';
                res.render('error', { pageTitle, pageData })
            }
        } catch (error) {
            const pageTitle = 'Internal Server Error';
            const pageData = 'we are working on it.';

            res.render('error', { pageTitle, pageData })
            console.error('Error during login:', error);
        }

    })();
});

app.get("/dashboard", async (req, res) => {

    const userId = req.session.userId; // Retrieve user ID from the session
    // console.log(userId);
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

            res.render('dashboard', { userInfo });

        } else {
            const userInfo = [...userInfo0];
            console.log("user data found");
            // Render the retrieved data or perform other actions
            res.render('dashboard', { userInfo });
        }

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get("/admin", async (req, res) => {
    try {
        const userData = await fetchUserData(); // Implement the fetchUserData function

        res.render('admin', { userData });
    } catch (error) {
        const pageTitle = 'Internal Server Error';
        const pageData = 'Error fetching user data';

        res.render('error', { pageTitle, pageData })
        console.error('Error fetching user data:', error.message);
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

//***payment part
app.post('/submitPaymentData', async (req, res) => {
    var { fullName, email, trackType, description, whatsappNumber } = req.body;
    description = convertToPlainText(description);
    var amount = 0;
    switch (trackType) {
        case "1":
            amount = 900
            break;
        case "2":
            amount = 1249.5
            break;
        case "3":
            amount = 2499.5
            break;
    }

    const orderId = 'Oid_' + new Date().getTime()
    const paytmParams = {}
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

        // payment gateway code below
        paytmParams.body = {
            "requestType": "Payment",
            "mid": PaytmConfig.PaytmConfig.mid,
            "websiteName": PaytmConfig.PaytmConfig.website,
            "orderId": orderId,
            "callbackUrl": url + "/callback",
            "txnAmount": {
                "value": amount,
                "currency": "INR",
            },
            "userInfo": {
                "custId": email,
            },
        };

        const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), PaytmConfig.PaytmConfig.key);
        paytmParams.head = {
            "signature": checksum
        };

        const post_data = JSON.stringify(paytmParams);

        const options = {

            // change hostname for staging
            hostname: 'securegw.paytm.in',
            port: 443,
            path: `/theia/api/v1/initiateTransaction?mid=${PaytmConfig.PaytmConfig.mid}&orderId=${orderId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        };

        const response = await sendPaytmRequest(options, post_data);

        console.log('txnToken:', response);

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.write(`<html>
            <head>
                <title>Show Payment Page</title>
            </head>
            <body>
                <center>
                    <h1>Please do not refresh this page...</h1>
                </center>
                <form method="post" action="https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${PaytmConfig.PaytmConfig.mid}&orderId=${orderId}" name="paytm">
                    <table border="1">
                        <tbody>
                            <input type="hidden" name="mid" value="${PaytmConfig.PaytmConfig.mid}">
                            <input type="hidden" name="orderId" value="${orderId}">
                            <input type="hidden" name="txnToken" value="${response.body.txnToken}">
                        </tbody>
                    </table>
                    <script type="text/javascript"> document.paytm.submit(); </script>
                </form>
            </body>
        </html>`);
        res.end();

    } catch (error) {
        console.error('Error registering user:', error);
        // res.status(500).json({ error: 'Internal Server Error' });
        const pageTitle = 'ERROR';
        const pageData = 'Error registering user. Contact us for help';
        res.render('error', { pageTitle, pageData });

    }

});

app.post("/callback", async (req, res) => {
    let callbackResponse = '';

    req.on('error', (err) => {
        console.error(err.stack);
    }).on('data', (chunk) => {
        callbackResponse += chunk;
    }).on('end', async () => {
        try {
            let data = qs.parse(callbackResponse);
            console.log(data);

            data = JSON.parse(JSON.stringify(data));

            const paytmChecksum = data.CHECKSUMHASH;

            var isVerifySignature = PaytmChecksum.verifySignature(data, PaytmConfig.PaytmConfig.key, paytmChecksum);
            if (isVerifySignature) {
                console.log("Checksum Matched");

                // Update the database value here
                const db = client.db(db1);
                const dataCollection = db.collection(dataCollection1);

                // Assuming there is a field 'paymentStatus' that needs to be updated
                const orderIdToUpdate = data.ORDERID;
                const updateResult = await dataCollection.updateOne(
                    { orderId: orderIdToUpdate },
                    { $set: { feePaid: True } }
                );


                console.log('Database Update Result:', updateResult);

                // Redirect to the dashboard page
                res.redirect('/dashboard');
            } else {
                console.log("Checksum Mismatched");
                res.status(400).send('Checksum Mismatched');

            }
        } catch (error) {
            console.error('Error in callback processing:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
});

//static pages
app.get("/staticPP", function (req, res) {
    res.render('./static/privacyPolicy');
})
app.get("/staticTC", function (req, res) {
    res.render('./static/terms');
})
app.get("/staticCP", function (req, res) {
    res.render('./static/cancellationPolicy');
})



// functions
function sendPaytmRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let response = '';

            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(response));
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

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

// Start the server and establish the MongoDB connection pool
startServer();