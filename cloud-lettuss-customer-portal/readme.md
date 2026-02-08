# Lettus Customer Portal

## Overview
The customer portal provides login, registration, property browsing, and subscription management for Lettus tenants. It connects to the Lettus Properties API and renders the UI from `lettuss-portal/public`.

## Local development (Docker)
Start the portal:
```
docker compose up
```

Rebuild after script or Docker changes:
```
docker compose up --build
```

## Startup helper script
Start the full portal stack with the helper:
```
bash -x customer-app-start.sh 4 0
```

## Local URL
- Portal: `https://lettusslettings.localhost/customer-portal/login`

## Portal UI assets
Static assets are served from `lettuss-portal/public/`. Update these files when changing the customer-facing UI.