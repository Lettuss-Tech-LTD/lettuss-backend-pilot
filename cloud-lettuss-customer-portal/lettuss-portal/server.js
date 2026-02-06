const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Load environment variables
dotenv.config({ path: '.env' });

var https = require('https');
var http = require('http');
var fs = require('fs');

const app = express();
const port = process.env.PORT || 8184;

const resolveCertPath = (envKey, fallbackFile) => {
    const directPath = process.env[envKey];
    if (directPath && fs.existsSync(directPath)) {
        return directPath;
    }
    const localPath = path.join(__dirname, '..', 'certs', fallbackFile);
    if (fs.existsSync(localPath)) {
        return localPath;
    }
    const containerPath = path.join('/app/certs', fallbackFile);
    return containerPath;
};

var options = {
    key: fs.readFileSync(resolveCertPath('SSL_KEY_PATH', 'server8184.key')),
    cert: fs.readFileSync(resolveCertPath('SSL_CERT_PATH', 'server8184.cert'))
  };

const isProd = process.env.IS_PROD === "true";
const isSSLDBypass = process.env.SSL_DB_BYPASS === "true" ? false : true;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Simplified headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Middleware to handle sessions
const session = require('express-session');

// Use environment variable for session secret or generate a new one
const sessionSecret = crypto.randomBytes(32).toString('hex') || process.env.SESSION_SECRET || '9824923489default243341342234session5512po2p123p2secret';
console.log("Server - new session - sessionSecret: " + sessionSecret);

// Function to generate a unique session ID
function generateUniqueSessionId() {
    // Combine timestamp, random bytes, and a counter for uniqueness
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const counter = process.hrtime.bigint().toString(36);
    
    // Combine and hash the components
    const combinedString = `${timestamp}-${randomBytes}-${counter}`;
    const hash = crypto.createHash('sha256')
        .update(combinedString)
        .digest('hex');
    
    // Return first 32 characters of the hash
    return hash.substring(0, 32);
}

// Update session middleware to use custom session ID generator
const sessionOptions = {
    genid: (req) => generateUniqueSessionId(),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: { 
        secure: true, 
        sameSite: 'Strict',
        maxAge: 2 * 60 * 1000,
        httpOnly: true
    },
    name: 'sessionID',
    unset: 'destroy'
};

// Add session middleware
app.use(session(sessionOptions));

// Add session refresh middleware
app.use((req, res, next) => {
    // Reset session timer on each request
    if (req.session) {
        req.session.touch();
    }
    next();
});

// Neo4j connection
const initNeo4jConnection = async () => {
    const uri = process.env.NEO4J_CLIENT_URI || 'bolt://host.docker.internal:17687';
    const user = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    
    try {
        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        await driver.verifyConnectivity();
        return driver;
    } catch (error) {
        console.error('Failed to connect to Neo4j:', error);
        return null;
    }
};

function generateCypherQuery(data) {
    // Default values for metrics if they're undefined
    const defaultMetrics = {
        sla_usage: '0',
        sla_deviation: '0',
        traffic_coef: '0',
        usage_connected_risk: '0',
        service_sla_tier1: '0',
        annual_downtime_minutes: '0',
        service_credit_back_tier1: '0'
    };

    const defaultCustomerMedian = {
        sla_usage: '0',
        sla_deviation: '0',
        traffic_coef: '0',
        usage_connected_risk: '0',
        service_sla_tier1: '0',
        annual_downtime_minutes: '0'
    };

    // Ensure data structure exists with defaults
    const { 
        companyName = 'Unknown Company', 
        projectName = 'Unknown Project', 
        services = [], 
        metrics = {
            customerMedian: defaultCustomerMedian,
            vendorMedians: {}
        } 
    } = data;

    let cypher = '';
    const processedVendors = new Set();
    const processedServices = new Set();

    // Sanitize company name for Cypher
    const companyId = companyName.replace(/[^a-zA-Z0-9]/g, '_');

    // Create customer node with all metrics, using defaults if undefined
    cypher += `
CREATE (cust_sessionid__name_${companyId}:CUSTOMER_NAME {
    name: '${companyName}',
    project_name: '${projectName}',
    median_sla_usage_percentage: '${metrics.customerMedian?.sla_usage || defaultCustomerMedian.sla_usage}%',
    median_sla_deviation_risk: '${metrics.customerMedian?.sla_deviation || defaultCustomerMedian.sla_deviation}',
    median_traffic_coefficient: '${metrics.customerMedian?.traffic_coef || defaultCustomerMedian.traffic_coef}%',
    median_usage_risk: '${metrics.customerMedian?.usage_connected_risk || defaultCustomerMedian.usage_connected_risk}',
    median_service_sla: '${metrics.customerMedian?.service_sla_tier1 || defaultCustomerMedian.service_sla_tier1}%',
    median_annual_downtime_minutes: '${metrics.customerMedian?.annual_downtime_minutes || defaultCustomerMedian.annual_downtime_minutes}',
    submission_date: '${new Date().toISOString()}'
})`;

    // Add vendor and service nodes with complete metrics
    services.forEach(service => {
        if (!service) return; // Skip if service is undefined

        // Ensure service has all required properties with defaults
        const safeService = {
            vendor: service.vendor || 'Unknown Vendor',
            name: service.name || 'Unknown Service',
            region: service.region || 'global',
            monthlyCost: service.monthlyCost || 0,
            metrics: { ...defaultMetrics, ...(service.metrics || {}) }
        };

        const serviceId = safeService.name.replace(/[^a-zA-Z0-9]/g, '_');
        const vendorId = safeService.vendor.replace(/[^a-zA-Z0-9]/g, '_');

        // Ensure vendor medians exist with defaults
        const vendorMedians = metrics.vendorMedians[safeService.vendor] || defaultCustomerMedian;

        // Only create vendor node if not already processed
        if (!processedVendors.has(vendorId)) {
            processedVendors.add(vendorId);
            cypher += `
CREATE (${vendorId}:TECHNOLOGY_PROVIDER {
    name: '${safeService.vendor}',
    median_sla_usage_percentage: '${vendorMedians.sla_usage || defaultCustomerMedian.sla_usage}%',
    median_sla_deviation_risk: '${vendorMedians.sla_deviation || defaultCustomerMedian.sla_deviation}',
    median_traffic_coefficient: '${vendorMedians.traffic_coef || defaultCustomerMedian.traffic_coef}%',
    median_usage_risk: '${vendorMedians.usage_connected_risk || defaultCustomerMedian.usage_connected_risk}',
    median_service_sla: '${vendorMedians.service_sla_tier1 || defaultCustomerMedian.service_sla_tier1}%',
    median_annual_downtime_minutes: '${vendorMedians.annual_downtime_minutes || defaultCustomerMedian.annual_downtime_minutes}'
})`;
        }

        // Only create service node if not already processed
        if (!processedServices.has(serviceId)) {
            processedServices.add(serviceId);
            cypher += `
CREATE (${serviceId}:TECHNOLOGY_SERVICE {
    name: '${safeService.name}',
    region: '${safeService.region}',
    monthly_cost: ${safeService.monthlyCost},
    sla_usage: '${safeService.metrics.sla_usage}%',
    sla_deviation_risk: '${safeService.metrics.sla_deviation}',
    traffic_coefficient: '${safeService.metrics.traffic_coef}%',
    usage_risk: '${safeService.metrics.usage_connected_risk}',
    annual_downtime_minutes: '${safeService.metrics.annual_downtime_minutes}',
    service_sla_tier1: '${safeService.metrics.service_sla_tier1}%',
    service_credit_back_tier1: '${safeService.metrics.service_credit_back_tier1}%'
})`;
        }

        // Create relationships
        cypher += `
CREATE (cust_sessionid__name_${companyId})-[:CUSTOMER_USES_SERVICE {
    monthly_cost: ${safeService.monthlyCost},
    region: '${safeService.region}'
}]->(${serviceId})

CREATE (${vendorId})-[:CONNECTED_RISK {
    sla_usage: '${safeService.metrics.sla_usage}%',
    sla_deviation_risk: '${safeService.metrics.sla_deviation}',
    traffic_coefficient: '${safeService.metrics.traffic_coef}%',
    usage_risk: '${safeService.metrics.usage_connected_risk}'
}]->(${serviceId})`;
    });

    return cypher;
}

// Function to delete previous Neo4j data
async function deletePreviousNeo4jData(sessionId) {
    const driver = await initNeo4jConnection();
    if (driver) {
        const session = driver.session();
        try {
            const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9]/g, '_');
            const deleteQuery = `
                MATCH (c:CUSTOMER_NAME {session_id: '${sanitizedSessionId}'})-[r:CUSTOMER_USES_SERVICE]->(s:TECHNOLOGY_SERVICE)
                DETACH DELETE c, r, s
            `;
            await session.run(deleteQuery);
            console.log('Previous Neo4j data deleted successfully');
        } catch (error) {
            console.error('Error deleting previous Neo4j data:', error);
        } finally {
            await session.close();
        }
    }
}

// Update saveNeo4jQuery function to include session ID
function saveNeo4jQuery(data, sessionId) {
    const outputDir = path.join(__dirname, 'neo4j_customer_submission');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Cloud.Risk.graph_${data.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.cypher`;
    const fullPath = path.join(outputDir, filename);

    // Sanitize sessionId for Neo4j
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9]/g, '_');

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate Cypher query
    let cypher = generateCypherQuery(data);

    // Add sanitized session ID to customer node
    cypher = cypher.replace(/CREATE \(cust_sessionid__/g, `CREATE (cust_sessionid_${sanitizedSessionId}_`);

    // Write to file
    fs.writeFileSync(fullPath, cypher);
    return fullPath;
}

// Update API endpoint to handle Neo4j file generation
app.post('/customer-portal/api/save-neo4j-query', async (req, res) => {
    const sessionId = req.sessionID;
    console.log("neo4j save - sessionId: " + sessionId);
    try {
        // Delete previous data
        await deletePreviousNeo4jData(sessionId);

        // Save new data
        const filePath = saveNeo4jQuery(req.body, sessionId);

        // Execute the new query
        const driver = await initNeo4jConnection();
        if (driver) {
            const cypher = generateCypherQuery(req.body);
            const session = driver.session();
            try {
                await session.run(cypher);
                console.log('Neo4j query executed successfully');
            } catch (error) {
                console.error('Error executing Neo4j query:', error);
            } finally {
                await session.close();
            }
        }

        res.json({ 
            success: true, 
            filePath,
            message: 'Data saved successfully' 
        });
    } catch (error) {
        console.error('Error saving Neo4j query:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Error saving or executing Neo4j query'
        });
    }
});

// API Routes
const apiRouter = express.Router();

// Routes

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSSLDBypass ? { rejectUnauthorized: false } : false // Disable SSL in development
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/customer-portal/login');
}

// Customer Portal as Login route
app.get('/customer-portal', (req, res) => {
    res.redirect('/customer-portal/login');
});

// Login route
app.get('/customer-portal/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/customer-portal/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM cloud_lettuss_portal.customers WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            // User does not exist, redirect to register
            return res.redirect('/customer-portal/register');
        }

        const isPasswordMatch = await bcrypt.compare(String(password), String(user.password));
        
        if (isPasswordMatch) {
            req.session.userId = user.id;
            req.session.sessionID = generateUniqueSessionId();
            res.redirect('/customer-portal/index?companyName=' + user.company + '&userId=' + user.id + '&sessionID=' + req.session.sessionID);
        } else {
            // Password does not match, suggest password reset
            res.status(401).send('Incorrect password. Please try again or <a href="/customer-portal/reset-password">reset your password</a>.');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Registration route
app.get('/customer-portal/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/customer-portal/register', async (req, res) => {
    const { username, email, customername, company, country, password, customer_type } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await pool.query(
            'INSERT INTO cloud_lettuss_portal.customers (username, email, customername, company, country, password, customer_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [username, email, customername, company, country, hashedPassword, customer_type]
        );
        res.redirect('/customer-portal/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Registration route
app.get('/customer-portal/upgrade', (req, res) => {
    const userId = req.query.userId;
    const companyName = req.query.companyName;

    // Read the HTML file
    let html = fs.readFileSync(path.join(__dirname, 'public', 'upgrade.html'), 'utf8');

    // Replace the companyName placeholder with the actual company name
    html = html.replace('{{companyName}}', companyName);

    // Replace the userId placeholder with the actual user ID
    html = html.replace('{{userId}}', userId);

    res.send(html);
});

app.post('/customer-portal/upgrade', async (req, res) => {
    const { userId, customer_type } = req.body;
    console.log(`Upgrade request received for user ${userId} with customer_type: ${customer_type}`);
    try {
        // Now timestamp the request
        const timestamp = new Date().toISOString();
        await pool.query(
            'UPDATE cloud_lettuss_portal.customers SET customer_type = $1, updated_at = $2 WHERE id = $3',
            [customer_type, timestamp, userId]
        );
        res.redirect('/customer-portal/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Logout route
app.get('/customer-portal/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/customer-portal/login');
    });
});

// Protect the customer-portal index route
app.get('/customer-portal/index', isAuthenticated, (req, res) => {
    const sessionID = req.query.sessionID || generateUniqueSessionId();
    req.session.sessionID = sessionID; // Update the sessionID in the session - if not declared req payload will be empty
    console.log("customer-portal - sessionID: " + sessionID);
    const companyName = req.query.companyName || '';
    const userId = req.query.userId || '1'; 
    // ... existing code to render customer-portal ...
    const envVars = {
        apiBaseUrl: process.env.IS_PROD === "true" ? process.env.PROD_API_BASE_URL : process.env.DEV_API_BASE_URL,
        appBaseUrl: process.env.IS_PROD === "true" ? process.env.PROD_APP_BASE_URL : process.env.DEV_APP_BASE_URL,
        isSSLBypassed: process.env.SSL_BYPASS === "true" ? false : true,
        isDevelopment: process.env.IS_PROD !== "true" ? true : false,
        companyName: companyName,
        userId: userId,
        sessionID: sessionID
    };
    // Serve the chart.js library
    app.use(express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));
    
    // Read the HTML file
    let html = fs.readFileSync(path.join(__dirname, 'public', 'customer-portal-index.html'), 'utf8');
    
    // Insert the environment variables as a global object
    const envScript = `<script>window.ENV = ${JSON.stringify(envVars)};</script>`;
    
    // Insert the script just after the <head> tag
    html = html.replace('<head>', '<head>' + envScript);

    // Replace the companyName placeholder with the actual company name
    html = html.replace('{{companyName}}', companyName);

    // Replace the userId placeholder with the actual user ID
    html = html.replace('{{userId}}', userId);

    // Replace the sessionID placeholder with the actual session ID
    html = html.replace('{{sessionID}}', sessionID);
    
    res.send(html);
});

// Cloud Risk Data API
apiRouter.get('/customer-portal/app/env', async (req, res) => {
    try {
        const apiBaseUrl = process.env.IS_PROD === "true" ? process.env.PROD_API_BASE_URL : process.env.DEV_API_BASE_URL;
        const appBaseUrl = process.env.IS_PROD === "true" ? process.env.PROD_APP_BASE_URL : process.env.DEV_APP_BASE_URL;
        res.status(200).json({ apiBaseUrl: apiBaseUrl, appBaseUrl: appBaseUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to serve the reset password page
app.get('/customer-portal/reset-password-form', async (req, res) => {
    const { token } = req.query;
    console.log(token);
    try {
        const result = await pool.query(
            'SELECT * FROM cloud_lettuss_portal.password_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
            [token]
        );
        const tokenRecord = result.rows[0];
        if (tokenRecord) {
            // Token is valid, read the HTML file and replace the placeholder with the actual token
            let html = fs.readFileSync(path.join(__dirname, 'public', 'reset-password-form.html'), 'utf8');
            html = html.replace('{{token}}', token);
            html = html.replace('{{email}}', tokenRecord.email);
            res.send(html);
        } else {
            // Token is invalid or expired
            res.status(400).send('Invalid or expired token.');
        }
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle password update
app.post('/customer-portal/update-password', async (req, res) => {
    const { token, 'new-password': newPassword } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM cloud_lettuss_portal.password_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
            [token]
        );
        const tokenRecord = result.rows[0];
        if (tokenRecord) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.query(
                'UPDATE cloud_lettuss_portal.customers SET password = $1 WHERE username = $2 AND email = $2',
                [hashedPassword, tokenRecord.email]
            );
            await markTokenAsUsed(token);

            // Send the response with the correct login link
            const appBaseUrl = process.env.IS_PROD === "true" ? process.env.PROD_APP_BASE_URL : process.env.DEV_APP_BASE_URL;
            res.send(`<p>Password updated successfully.</p><p><a href="${appBaseUrl}/customer-portal/login">Customer Portal login</a></p>`);
        } else {
            res.status(400).send('Invalid or expired token.');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).send('Internal Server Error');
    }
    // Update password_tokes table used column to TRUE
    await pool.query('UPDATE cloud_lettuss_portal.password_tokens SET used = TRUE WHERE token = $1', [token]);
});

// Function mark toket as used
async function markTokenAsUsed(token) {
    await pool.query('UPDATE cloud_lettuss_portal.password_tokens SET used = TRUE WHERE token = $1', [token]);
}

// Route to handle password reset requests
app.get('/customer-portal/reset-password', async (req, res) => {
    // Collection email from the request body
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.post('/customer-portal/reset-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT * FROM cloud_lettuss_portal.customers WHERE username = $1 AND email = $1', [email]);
        const user = result.rows[0];
        if (user) {
            // Generate a reset token and send an email (pseudo-code)
            const resetToken = generateResetToken(); // Implement this function
            await sendResetEmail(email, resetToken); // Implement this function
            res.send('A password reset link has been sent to your email.');
        } else {
            res.status(404).send('Email not found.');
        }
    } catch (error) {
        console.error('Error handling password reset:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to generate a reset token
function generateResetToken() {
    // Generate a random string and hash it using SHA-256
    const randomString = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(randomString).digest('hex');
    
    // Truncate the hash to 32 characters to simulate a "SHA-128" size
    return hash.substring(0, 32);
}

// Function to send a reset email
async function sendResetEmail(email, token) {
    console.log(`Sending reset email to ${email} with token ${token}`);

    // Generate a password reset URL
    const appBaseUrl = process.env.IS_PROD === "true" ? process.env.PROD_APP_BASE_URL : process.env.DEV_APP_BASE_URL;
    const resetUrl = `${appBaseUrl}/customer-portal/reset-password-form?token=${token}`;

    // Create a transporter object using SMTP transport
    const OAuth2 = google.auth.OAuth2;

    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID, // ClientID
        process.env.CLIENT_SECRET, // Client Secret
        "https://developers.google.com/oauthplayground" // Redirect URL
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN
    });

    const accessToken = oauth2Client.getAccessToken();

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.SMTP_USER,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: accessToken
        }
    });

    // Email content
    const mailOptions = {
        from: '"CloudRiskGraph.com" <no-reply@CloudRiskGraph.com>', // sender address
        to: email, // list of receivers
        subject: `CloudRiskGraph.com - Password Reset Request - InsureYourTech.Cloud -  ${email}`, // Subject line
        text: `You requested a password reset. Click the link, valid 1h, to reset your password: ${resetUrl}`, // plain text body
        html: `<p>You requested a password reset. Click the link, valid 1h, to reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p>` // html body
    };

    // Send mail with defined transport object
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
    console.log('Email sent to:', email);
    // Store the reset token in the database
    console.log('Storing reset token in the database');
    try {
        await storeResetToken(email, token);
    } catch (error) {
        console.error('Error storing reset token:', error);
    }
}

async function storeResetToken(email, token) {
    const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour
    try {
        await pool.query(
            'INSERT INTO cloud_lettuss_portal.password_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
            [email, token, expiresAt]
        );
    } catch (error) {
        console.error('Error storing reset token:', error);
    }
}

// Add new endpoint to save customer submissions
app.post('/customer-portal/save-customer-submission', async (req, res) => {
    const customerId = req.query.userId;
    const sessionId = req.query.sessionID || generateUniqueSessionId();
    console.log("save submission - sessionId: " + sessionId);
    
    try {
        // First verify the customer exists and get their info
        const customerQuery = await pool.query(
            'SELECT id FROM cloud_lettuss_portal.customers WHERE id = $1',
            [customerId]
        );

        if (!customerQuery.rows.length) {
            throw new Error('Customer not found');
        }

        const userId = customerQuery.rows[0].id;
        const { companyName, projectName, services } = req.body;
        
        // Check for existing submission
        const submissionQuery = await pool.query(
            'SELECT session_id FROM cloud_lettuss_portal.customer_submissions WHERE user_id = $1 AND session_id = $2',
            [userId, sessionId]
        );
        
        if (!submissionQuery.rows.length) {
            console.log('Session_id not found in the database - creating new submission');
            // Save submission to database
            await pool.query(
                `INSERT INTO cloud_lettuss_portal.customer_submissions 
                (session_id, user_id, company_name, project_name, submission_data, created_at) 
                VALUES ($1, $2, $3, $4, $5, NOW())`,
                [sessionId, userId, companyName, projectName, JSON.stringify(services)]
            );
        } else {
            console.log('Session_id found in the database - updating existing submission');
            // Update submission to database
            await pool.query(
                `UPDATE cloud_lettuss_portal.customer_submissions 
                SET submission_data = $1, updated_at = NOW() 
                WHERE session_id = $2 AND user_id = $3`,
                [JSON.stringify(services), sessionId, userId]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Submission saved successfully' 
        });
    } catch (error) {
        console.error('Error saving submission:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            details: 'Error saving submission'
        });
    }
});

// Start server
if (isProd) {
    https.createServer(options, app).listen(port);
} else if (process.env.SSL_ENABLED === "true") {
    https.createServer(options, app).listen(port);
} else {
    http.createServer(app).listen(port);
}