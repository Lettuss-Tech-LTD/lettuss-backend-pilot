const { Pool } = require('pg');

// Create a pool of connections for cloud_lettuss_portal
const poolCloudRiskPortal = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PORTAL,
    schema: process.env.DB_NAME_PORTAL,
    search_path: process.env.DB_NAME_PORTAL,
    port: process.env.DB_PORT,
    max: 100,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

poolCloudRiskPortal.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    if (process.env.NODE_ENV !== 'production') {
        process.exit(-1);
    }
});

// Use async/await for initial connection test
const testConnection = async (pool, dbName) => {
    try {
        const connection = await pool.connect();
        console.log(await pool.query('select current_schema;'));
        console.log(`Database ${dbName} connected successfully!`);
        connection.release();
    } catch (err) {
        console.error(`Database connection error for ${dbName}:`, err.message);
        throw err;
    }
};

testConnection(poolCloudRiskPortal, process.env.DB_NAME_PORTAL);

module.exports = { poolCloudRiskPortal };
