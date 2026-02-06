-- Backup customers and submissions to temporary tables
CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.customers_backup AS 
SELECT * FROM cloud_lettuss_portal.customers;

CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.customer_submissions_backup AS 
SELECT * FROM cloud_lettuss_portal.customer_submissions;

-- Export to CSV (using COPY command)
\COPY cloud_lettuss_portal.customers TO '/backup/customers.csv' WITH (FORMAT CSV, HEADER);
\COPY cloud_lettuss_portal.customer_submissions TO '/backup/customer_submissions.csv' WITH (FORMAT CSV, HEADER);