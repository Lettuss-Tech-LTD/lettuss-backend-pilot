const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env' });

var https = require('https');
var http = require('http');
var fs = require('fs');

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
  key: fs.readFileSync(resolveCertPath('SSL_KEY_PATH', 'server8183.key')),
  cert: fs.readFileSync(resolveCertPath('SSL_CERT_PATH', 'server8183.cert'))
};

// Variables to start the server
const PORT = process.env.PORT || 8183;
const DB_HOST = process.env.DB_HOST || 'postgres-db'; // localhost
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'dbusername';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_NAME = process.env.DB_NAME || 'cloud_lettuss_portal';
const DB_NAME_PORTAL = process.env.DB_NAME_PORTAL || 'cloud_lettuss_portal';
const IS_PROD = process.env.IS_PROD === "true";

const lettusRentalRouter = require('./routes/LettusRental');

const app = express();

app.use(express.json());
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// API Routes
app.use('/lettus', lettusRentalRouter);

//app.listen(PORT, function () {
//console.log(`Server is running on http://localhost:${PORT}`);
//});

// Start server
if (IS_PROD) {
  https.createServer(options, app).listen(PORT);
} else if (process.env.SSL_ENABLED === "true") {
  https.createServer(options, app).listen(PORT);
} else {
  http.createServer(app).listen(PORT);
}
