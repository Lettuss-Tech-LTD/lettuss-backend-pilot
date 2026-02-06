#!/bin/bash

# Configuration
DB_USER="postgres"
DB_PASSWORD="password"
DB_NAME="cloud_lettuss_portal"
BACKUP_DIR="backup"
UPLOAD_DIR="upload"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="postgres-db"  # Match container name from docker-compose.yml

# Create backup directories if they don't exist
mkdir -p $BACKUP_DIR
mkdir -p $UPLOAD_DIR

# Full database backup
echo "Creating full database backup..."
docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
    pg_dump -U $DB_USER -d $DB_NAME -F c -f "/tmp/full_backup_$DATE.dump"
docker cp $CONTAINER_NAME:/tmp/full_backup_$DATE.dump $BACKUP_DIR/

# Copy the SQL script into the container
docker cp backup_customers.sql $CONTAINER_NAME:/tmp/
docker cp $BACKUP_DIR $CONTAINER_NAME:/

# Run the SQL backup script for specific tables
echo "Backing up customers and submissions tables..."
docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME \
    psql -U $DB_USER -d $DB_NAME -f /tmp/backup_customers.sql

# Copy the generated CSV files from container to host
docker cp $CONTAINER_NAME:/backup/customers.csv $BACKUP_DIR/
docker cp $CONTAINER_NAME:/backup/customer_submissions.csv $BACKUP_DIR/

# Move to upload folder
mv $BACKUP_DIR/customers.csv $UPLOAD_DIR/new_customers.csv
mv $BACKUP_DIR/customer_submissions.csv $UPLOAD_DIR/new_customer_submissions.csv

echo "Backup completed successfully!"