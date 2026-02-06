all: lettuss_api lettuss_portal
all_down: lettuss_api_down lettuss_portal_down
help:
	@echo "Lettus Make targets:"
	@echo "  make all            Start API and portal stacks"
	@echo "  make all_down       Stop API and portal stacks"
	@echo "  make lettuss_api    Start API stack"
	@echo "  make lettuss_api_down  Stop API stack"
	@echo "  make lettuss_portal    Start portal stack"
	@echo "  make lettuss_portal_down Stop portal stack"

lettuss_api:
	sleep 1
	cd cloud-lettuss-properties-api ; bash -x build-api-cluster.sh 4 0 ; cd ..
	sleep 30

lettuss_api_down:
	sleep 1
	cd cloud-lettuss-properties-api ; docker compose down ; cd ..
	sleep 1

lettuss_portal:
	sleep 1
	cd cloud-lettuss-customer-portal ; bash -x customer-app-start.sh 4 0 ; cd ..
	sleep 30

lettuss_portal_down:
	sleep 1
	cd cloud-lettuss-customer-portal ; docker compose down ; cd ..
	sleep 1
