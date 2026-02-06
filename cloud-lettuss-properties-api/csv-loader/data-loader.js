const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const fs = require('fs');
const { Pool } = require('pg');
const csv = require('csv-parser');

// Set up PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  schema: process.env.DB_NAME,
  search_path: process.env.DB_NAME,
  max: 100,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

function loadCSV(filePath, callback) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Process each field in the row object
      const processedRow = {};
      Object.keys(row).forEach(key => {
        let value = row[key];
        if (typeof value === 'string') {
          // remove invisible characters
          value = value.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
          // remove leading and trailing whitespace
          value = value.trim();
          // replace characters '\'' by '.'
          value = value.replace(/\\'/g, '.');
        }
        // Only add non-empty values
        if (value !== '') {
          processedRow[key] = value;
        }
      });
      
      // Only add non-empty rows
      if (Object.keys(processedRow).length > 0) {
        results.push(processedRow);
      }
    })
    .on('end', function () {
      console.log('CSV file successfully processed');
      callback(null, results); // Pass the parsed results to the callback
    })
    .on('error', function (err) {
      callback(err); // Pass error to the callback
    });
}

function insertData(rows, tableName, callback) {
  // Add sleep helper function
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Make this an async function
  pool.connect(async function (err, client, release) {
    if (err) {
      return callback(err);
    }
    
    console.log(await pool.query('select current_schema;'));
    await sleep(2*1000);

    client.query('BEGIN', function (err) {
      if (err) {
        release();
        return callback(err);
      }

      let insertPromises = rows.map(function (row) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row).map(function (val) {
          return `'${val}'`; // All values as strings since we handle types in DB
        }).join(', ');

        const query = `INSERT INTO "${process.env.DB_NAME}".${tableName} (${columns}) VALUES (${values})`;
        return client.query(query);
      });

      // Execute all insert queries in parallel
      Promise.all(insertPromises)
        .then(function () {
          return client.query('COMMIT'); // Commit the transaction
        })
        .then(function () {
          release();
          callback(null, 'Data successfully inserted');
        })
        .catch(function (err) {
          client.query('ROLLBACK', function () { release(); }); // Rollback on error
          callback(err);
        });
    });
  });
}

function main(files) {
  // Process each file sequentially
  const processFile = (fileInfo, callback) => {
    loadCSV(fileInfo.path, function (err, rows) {
      if (err) {
        console.error(`Error loading CSV ${fileInfo.path}:`, err);
        return callback(err);
      }
      insertData(rows, fileInfo.table, function (err, result) {
        if (err) {
          console.error(`Error inserting data into ${fileInfo.table}:`, err);
          return callback(err);
        }
        console.log(`Successfully loaded data into ${fileInfo.table}`);
        callback(null, result);
      });
    });
  };

  // Get file arguments
  const fileInfos = [];
  for (let i = 2; i < process.argv.length; i += 2) {
    fileInfos.push({
      path: process.argv[i],
      table: process.argv[i + 1]
    });
  }

  // Process files sequentially
  let currentIndex = 0;
  const processNext = () => {
    if (currentIndex >= fileInfos.length) {
      console.log('All files processed successfully');
      return;
    }

    processFile(fileInfos[currentIndex], (err) => {
      if (err) {
        console.error('Stopping due to error');
        return;
      }
      currentIndex++;
      processNext();
    });
  };

  processNext();
}

// Execute the main function with the provided CSV file path
const filePath = process.argv[2]; // Get the CSV file path from command-line arguments

//validate variables
const DB_HOST = process.env.DB_HOST || 'postgres-db'; // localhost
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_NAME = process.env.DB_NAME || 'cloud_lettuss_properties_catalogue';

main(filePath);
