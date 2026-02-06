Lettus Kubernetes (Istio)

Steps (high level)
1) Create namespace and apply manifests:
   kubectl apply -f namespace.yaml
   kubectl apply -f postgres.yaml
   kubectl apply -f node-api.yaml
   kubectl apply -f portal.yaml
   kubectl apply -f istio-gateway.yaml

2) Load the full PostgreSQL schema:
  kubectl create configmap lettus-postgres-init \
    --from-file=create_database.sql=../../../cloud-lettuss-properties-api/create-cloud-lettuss-db.sql \
     -n lettus --dry-run=client -o yaml | kubectl apply -f -

3) Create TLS secret for Istio:
   kubectl create secret tls lettusslettings-tls \
     --cert=fullchain.pem \
     --key=privkey.pem \
     -n lettus

4) Update container images:
   - lettus/node-api:latest
   - lettus/portal:latest

Notes
- TLS is terminated at the Istio ingress gateway.
- The API listens on https://api.lettusslettings.co.uk/lettus/*
- The portal listens on https://lettusslettings.co.uk/customer-portal/*
