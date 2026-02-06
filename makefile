all: lettus_api lettus_portal

lettus_api:
	sleep 1
	cd cloud-lettuss-properties-api ; bash -x build-api-cluster.sh 4 0 ; cd ..
	sleep 30

lettus_portal:
	sleep 1
	cd cloud-lettuss-customer-portal ; bash -x customer-app-start.sh 4 0 ; cd ..
	sleep 30
