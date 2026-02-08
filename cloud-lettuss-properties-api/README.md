# Lettus Rental Properties API

## Overview
This service powers the Lettus rental portal by providing property listings and managing tenant subscriptions. It reads and writes to PostgreSQL and exposes JSON APIs consumed by the customer portal.

## Deployment
The API is deployed using Docker and Docker Compose. The `docker-compose.yml` file in this directory builds and runs the API, Postgres, and Nginx proxy.

## Local run (Docker)
From this directory:
```
docker compose up -d
```

## API endpoints
Core routes are exposed under `/lettus/*`:
- `GET /lettus/properties` — list properties (supports query filters)
- `GET /lettus/properties/:id` — fetch property by id
- `POST /lettus/properties` — create property
- `PUT /lettus/properties/:id` — update property
- `POST /lettus/subscriptions` — create a subscription
- `GET /lettus/subscriptions/tenant/:tenantId` — list subscriptions by tenant
- `GET /lettus/subscriptions/property/:propertyId` — list subscriptions by property
- `PATCH /lettus/subscriptions/:id/cancel` — cancel subscription

## Example usage
List available properties:
```
curl -X GET https://api.lettusslettings.localhost/lettus/properties?status=available
```

Create a subscription:
```
curl -X POST https://api.lettusslettings.localhost/lettus/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"property_id": 1, "tenant_id": 1}'
```

## CSV loader
Seed the database from CSVs using `csv-loader`:

```
cd csv-loader
cp .env.example .env
npm install
node data-loader.js
```

Sample CSV files live in `data/`:
```
cat data/lettuss_rental_properties.csv
cat data/lettuss_rental_subscriptions.csv
```

## Build only (no run)
To rebuild the API without running it, use option 3:
```
bash -x build-api-cluster 3
```