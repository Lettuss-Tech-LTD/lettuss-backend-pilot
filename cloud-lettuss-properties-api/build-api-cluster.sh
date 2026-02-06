#!/bin/bash
# 
# BUILD_METHOD = 
# BUILD_METHOD = 1  - docker compose up
# BUILD_METHOD = 2  - docker compose up --build
# BUILD_METHOD = 3  - docker compose up --build --force-recreate
# BUILD_METHOD = 4  - docker compose up -d --build --force-recreate
# BUILD_METHOD =    - docker compose ps

BUILD_METHOD="${1:-0}" # 1 or 0

DOCKER_PODMAN="${2:-0}" # 1 or 0

DOCKER_FILE="${3:-0}" # 1 or 0

if [[ "$DOCKER_PODMAN" == "1" ]]; then
   echo "Using Docker Podman"
   DOCKER_COMPOSE_CMD="docker-compose"
   DOCKER_CMD="docker"
else
   echo "Using Docker"
   DOCKER_COMPOSE_CMD="docker compose"
   DOCKER_CMD="docker"
fi

if [[ "$DOCKER_FILE" == "1" ]]; then
   DOCKER_FILE="no-outage-workbench-loader.docker-compose.yml"
else
   DOCKER_FILE="docker-compose.yml"
fi

if [[ "$BUILD_METHOD" == "1" ]]; then
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up
elif [[ "$BUILD_METHOD" == "2" ]]; then
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE rm -sfv # just remove containers and volumes of the compose project
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up --build
elif [[ "$BUILD_METHOD" == "3" ]]; then
   echo "Backup customers"
   cd backup_customers; ./backup_db.sh ; cd ..
   echo "Backup customers done"
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE rm -sfv # just remove containers and volumes of the compose project
   #$DOCKER_CMD system prune -f
   #$DOCKER_CMD volume prune -f
   $DOCKER_CMD volume ls
   $DOCKER_CMD volume rm -f cloud-lettuss-properties-api_postgres_data
  echo "populate database"
  cat > data/lettuss_rental_properties.csv <<'EOF'
title,description,property_type,address_line1,city,country,postal_code,bedrooms,bathrooms,monthly_rent,deposit_amount,available_from,status,published_at
Lettus Riverside Apartment,Two-bedroom apartment with river views,flat,12 Riverside Walk,London,UK,SE1 7PB,2,2,1850.00,1850.00,2026-03-01,available,2026-02-05 10:00:00
Lettus City Loft,Open-plan loft close to transit,studio,88 King Street,Manchester,UK,M1 2AB,0,1,1200.00,1200.00,2026-03-10,available,2026-02-04 14:30:00
Lettus Family Home,Three-bedroom home with garden,house,4 Oak Lane,Bristol,UK,BS1 5HT,3,2,2100.00,2100.00,2026-03-15,available,2026-02-03 09:00:00
EOF
  cat > data/lettuss_rental_subscriptions.csv <<'EOF'
property_id,tenant_id,status,start_date,end_date,score_value,score_band,scored_at
1,1,active,2026-02-10,,82.50,good,2026-02-05 12:00:00
EOF
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up --build --force-recreate --remove-orphans
   echo "Restore customers - wait 5 seconds"
   sleep 5
   ./backup_customers/update_db.sh
   echo "Restore customers done"
elif [[ "$BUILD_METHOD" == "4" ]]; then
   echo "Backup customers"
   cd backup_customers; ./backup_db.sh ; cd ..
   echo "Backup customers done"
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE rm -sfv # just remove containers and volumes of the compose project
   #$DOCKER_CMD system prune -f
   #$DOCKER_CMD volume prune -f
  $DOCKER_CMD volume ls
  $DOCKER_CMD volume rm -f cloud-lettuss-properties-api_postgres_data
  echo "populate database"
  cat > data/lettuss_rental_properties.csv <<'EOF'
title,description,property_type,address_line1,city,country,postal_code,bedrooms,bathrooms,monthly_rent,deposit_amount,available_from,status,published_at
Lettus Riverside Apartment,Two-bedroom apartment with river views,flat,12 Riverside Walk,London,UK,SE1 7PB,2,2,1850.00,1850.00,2026-03-01,available,2026-02-05 10:00:00
Lettus City Loft,Open-plan loft close to transit,studio,88 King Street,Manchester,UK,M1 2AB,0,1,1200.00,1200.00,2026-03-10,available,2026-02-04 14:30:00
Lettus Family Home,Three-bedroom home with garden,house,4 Oak Lane,Bristol,UK,BS1 5HT,3,2,2100.00,2100.00,2026-03-15,available,2026-02-03 09:00:00
EOF
  cat > data/lettuss_rental_subscriptions.csv <<'EOF'
property_id,tenant_id,status,start_date,end_date,score_value,score_band,scored_at
1,1,active,2026-02-10,,82.50,good,2026-02-05 12:00:00
EOF
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up -d --build --force-recreate --remove-orphans > /dev/null 2>&1
   echo "Customer Backend API , built! Now, wait 10 seconds for the database to be ready."
   echo "Restore customers - wait 5 seconds"
   sleep 5
   cd backup_customers; ./update_db.sh ; cd ..
   echo "Restore customers done"
else
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE ps
fi
