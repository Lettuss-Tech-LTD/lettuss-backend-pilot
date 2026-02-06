#!/bin/bash

# Configuration
DB_USER="postgres"
DB_PASSWORD="password"
DB_NAME="cloud_lettuss_portal"
UPDATE_DIR="upload"
CONTAINER_NAME="postgres-db"  # Match container name from docker-compose.yml

# Function to check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo "Error: File $1 not found!"
        exit 1
    fi
}

# Verify input files exist
check_file "$UPDATE_DIR/new_customers.csv"
check_file "$UPDATE_DIR/new_customer_submissions.csv"

# Copy CSV files to container
docker cp $UPDATE_DIR $CONTAINER_NAME:/

# Execute database updates
docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME << EOF
-- Create temporary tables
CREATE TEMP TABLE temp_customers (LIKE cloud_lettuss_portal.customers);
CREATE TEMP TABLE temp_submissions (LIKE cloud_lettuss_portal.customer_submissions);

-- Load new data
\COPY temp_customers FROM '/upload/new_customers.csv' WITH (FORMAT CSV, HEADER);
\COPY temp_submissions FROM '/upload/new_customer_submissions.csv' WITH (FORMAT CSV, HEADER);

-- Begin transaction
BEGIN;

-- Backup existing data (optional)
CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.customers_backup_$(date +%Y%m%d) AS 
SELECT * FROM cloud_lettuss_portal.customers;

CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.customer_submissions_backup_$(date +%Y%m%d) AS 
SELECT * FROM cloud_lettuss_portal.customer_submissions;

-- Update existing records
UPDATE cloud_lettuss_portal.customers c
SET 
    username = t.username,
    email = t.email,
    password = t.password,
    customername = t.customername,
    company = t.company,
    country = t.country,
    customer_type = t.customer_type,
    is_active = t.is_active,
    is_deleted = t.is_deleted,
    updated_at = CURRENT_TIMESTAMP
FROM temp_customers t
WHERE c.id = t.id;

-- Insert new records
INSERT INTO cloud_lettuss_portal.customers 
SELECT t.* 
FROM temp_customers t
LEFT JOIN cloud_lettuss_portal.customers c ON t.id = c.id
WHERE c.id IS NULL;

-- Update submissions
UPDATE cloud_lettuss_portal.customer_submissions cs
SET 
    customer_id = t.customer_id,
    session_id = t.session_id,
    company_name = t.company_name,
    project_name = t.project_name,
    submission_data = t.submission_data,
    created_at = t.created_at,
    updated_at = t.updated_at,
    status = t.status
FROM temp_submissions t
WHERE cs.id = t.id;

-- Insert new submissions
INSERT INTO cloud_lettuss_portal.customer_submissions 
SELECT t.* 
FROM temp_submissions t
LEFT JOIN cloud_lettuss_portal.customer_submissions cs ON t.id = cs.id
WHERE cs.id IS NULL;

-- Commit transaction
COMMIT;

-- Cleanup
DROP TABLE temp_customers;
DROP TABLE temp_submissions;

-- Verify counts
SELECT 'Customers count: ' || COUNT(*) FROM cloud_lettuss_portal.customers;
SELECT 'Submissions count: ' || COUNT(*) FROM cloud_lettuss_portal.customer_submissions;
EOF

echo "Database update completed successfully!"