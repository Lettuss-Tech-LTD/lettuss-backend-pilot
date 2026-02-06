--
-- Create the cloud_lettuss_portal schema
-- Note: POSTGRES_DB is already set to cloud_lettuss_portal in docker-compose.
-- The init scripts run in that database, so do not CREATE DATABASE here.
CREATE SCHEMA IF NOT EXISTS cloud_lettuss_portal;
SET search_path TO cloud_lettuss_portal, public;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cloud_lettuss_portal TO postgres;
grant all on database cloud_lettuss_portal to postgres;
grant all on schema "public" to postgres;
grant all on all tables in schema "public" to postgres;
grant all on all sequences in schema "public" to postgres;
grant all on schema "cloud_lettuss_portal" to postgres;
grant all on all tables in schema "cloud_lettuss_portal" to postgres;
grant all on all sequences in schema "cloud_lettuss_portal" to postgres;

CREATE TABLE cloud_lettuss_portal.password_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

SELECT cron.schedule('delete_expired_tokens', '0 * * * *', $$
     DELETE FROM cloud_lettuss_portal.password_tokens
     WHERE expires_at < NOW() - interval '1 hours 10 minutes'
   $$);

CREATE TABLE cloud_lettuss_portal.customers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    customername VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    customer_type VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a new table for the customer_submissions
INSERT INTO cloud_lettuss_portal.customers (username, email, customername, company, country, password, customer_type)
 VALUES ('business@insureyourtech.cloud', 'business@insureyourtech.cloud', 'InsureYourTech.Cloud - Simulation Company', 'InsureYourTech.Cloud - Simulation Company', 'UK', '$2b$10$BiqmYf6pgbgS2bVGbBHWsO8t3w5upTVHhDclmMFQoIIbaUyggAfHW', 'freemium');
-- password: testpassword = $2b$10$LvZ3aQVe3WSROOdJ3faG7ehi4lez9WwmLIwZnNgjqitiJqZGaRyuS
INSERT INTO cloud_lettuss_portal.customers (username, email, customername, company, country, password, customer_type)
 VALUES ('joao@fuelbigdata.com', 'joao@fuelbigdata.com', 'Joao P. A. Cerqueira', 'Fuel Data Science Big Data Limited', 'UK', '$2b$10$BiqmYf6pgbgS2bVGbBHWsO8t3w5upTVHhDclmMFQoIIbaUyggAfHW', 'premium');
-- password: testpassword = $2b$10$LvZ3aQVe3WSROOdJ3faG7ehi4lez9WwmLIwZnNgjqitiJqZGaRyuS

SELECT * FROM cloud_lettuss_portal.customers;

---  create a new database table to store the customer_submissions
CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.customer_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES cloud_lettuss_portal.customers(id),
    session_id VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255),
    submission_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO cloud_lettuss_portal.customer_submissions (user_id, session_id, company_name, project_name, submission_data)
VALUES (1, '1663363006787704fd145138523d4is1', 'InsureYourTech.Cloud - Simulation Company', 'InsureYourTech.Cloud - Simulation Company Project', '{"services": [{"vendor": "Amazon AWS", "service": "Amazon AWS Lambda", "region": "global", "monthly_cost": 1000},{"vendor": "Microsoft Azure", "service": "Azure Functions", "region": "global", "monthly_cost": 1000}]}'
);
INSERT INTO cloud_lettuss_portal.customer_submissions (user_id, session_id, company_name, project_name, submission_data)
VALUES (2, '1663363006787704fd145138523d4bd2', 'Fuel Data Science Big Data Limited', 'Fuel Data Science Big Data Limited - Project One', '{"services": [{"vendor": "Amazon AWS", "service": "Amazon AWS Lambda", "region": "global", "monthly_cost": 1000},{"vendor": "Microsoft Azure", "service": "Azure Functions", "region": "global", "monthly_cost": 1000}]}'
);

SELECT * FROM cloud_lettuss_portal.customer_submissions;

-- Lettus Lettings tables
CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.rental_properties (
    id SERIAL PRIMARY KEY,
    landlord_id INTEGER REFERENCES cloud_lettuss_portal.customers(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(50),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    bedrooms INTEGER,
    bathrooms INTEGER,
    monthly_rent DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2),
    available_from DATE,
    status VARCHAR(20) DEFAULT 'available',
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rental_properties_status_idx
    ON cloud_lettuss_portal.rental_properties (status);
CREATE INDEX IF NOT EXISTS rental_properties_city_idx
    ON cloud_lettuss_portal.rental_properties (city);
CREATE INDEX IF NOT EXISTS rental_properties_published_idx
    ON cloud_lettuss_portal.rental_properties (published_at);

INSERT INTO cloud_lettuss_portal.rental_properties
    (title, description, property_type, address_line1, city, country, postal_code, bedrooms, bathrooms, monthly_rent, deposit_amount, available_from, status, published_at)
VALUES
    ('Lettus City Studio', 'Modern studio close to transport links.', 'studio', '12 Market Street', 'London', 'UK', 'EC1A 1AA', 0, 1, 1250.00, 1250.00, CURRENT_DATE, 'available', NOW() - interval '3 days'),
    ('Lettus Garden Flat', 'Two-bedroom flat with shared garden.', 'flat', '44 Park Lane', 'Manchester', 'UK', 'M1 1AE', 2, 1, 1450.00, 1450.00, CURRENT_DATE + interval '7 days', 'available', NOW() - interval '2 days'),
    ('Lettus Family Home', 'Spacious three-bedroom home near schools.', 'house', '8 Elm Drive', 'Bristol', 'UK', 'BS1 4ST', 3, 2, 1850.00, 1850.00, CURRENT_DATE + interval '14 days', 'available', NOW() - interval '1 day');

select * from cloud_lettuss_portal.rental_properties;

-- Lettus Lettings subscriptions table
CREATE TABLE IF NOT EXISTS cloud_lettuss_portal.rental_subscriptions (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES cloud_lettuss_portal.rental_properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES cloud_lettuss_portal.customers(id),
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    score_value DECIMAL(5,2),
    score_band VARCHAR(20),
    scored_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cloud_lettuss_portal.rental_subscriptions
    (property_id, tenant_id, status, start_date, end_date, score_value, score_band, scored_at)
VALUES
    (1, 1, 'active', CURRENT_DATE, CURRENT_DATE + interval '1 year', 82.50, 'good', NOW() - interval '1 day'),
    (2, 2, 'active', CURRENT_DATE, CURRENT_DATE + interval '1 year', 78.00, 'good', NOW() - interval '2 days'),
    (3, 1, 'active', CURRENT_DATE, CURRENT_DATE + interval '1 year', 85.00, 'excellent', NOW() - interval '3 days');

SELECT * FROM cloud_lettuss_portal.rental_subscriptions;
