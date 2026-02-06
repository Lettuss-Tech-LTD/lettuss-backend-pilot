all: lettus_api lettus_portal
all_down: lettus_api_down lettus_portal_down

lettus_api:
	sleep 1
	cd cloud-lettuss-properties-api ; bash -x build-api-cluster.sh 4 0 ; cd ..
	sleep 30

lettus_api_down:
	sleep 1
	cd cloud-lettuss-properties-api ; docker compose down ; cd ..
	sleep 1

lettus_portal:
	sleep 1
	cd cloud-lettuss-customer-portal ; bash -x customer-app-start.sh 4 0 ; cd ..
	sleep 30

lettus_portal_down:
	sleep 1
	cd cloud-lettuss-customer-portal ; docker compose down ; cd ..
	sleep 1
