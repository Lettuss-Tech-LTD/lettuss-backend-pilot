#!/bin/bash
#
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

DOCKER_FILE="${3:-0}" # 2 or 1 or 0

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
   echo "Using NoPython Docker Compose file"
   DOCKER_FILE="nopython-docker-compose.yml"
elif [[ "$DOCKER_FILE" == "2" ]]; then
   echo "Using NoPython Docker Compose file"
   DOCKER_FILE="local-docker-compose.yml"
else
   echo "Using Python Docker Compose file"
   DOCKER_FILE="docker-compose.yml"
fi

if [[ "$BUILD_METHOD" == "1" ]]; then
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up 
else
   $DOCKER_COMPOSE_CMD ps
fi
if [[ "$BUILD_METHOD" == "2" ]]; then
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE rm -sfv # just remove containers and volumes of the compose project
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up --build
else
   $DOCKER_COMPOSE_CMD ps
fi
if [[ "$BUILD_METHOD" == "3" ]]; then
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE rm -sfv # just remove containers and volumes of the compose project
   #$DOCKER_CMD system prune -f
   #$DOCKER_CMD volume prune -f
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up --build --force-recreate
elif [[ "$BUILD_METHOD" == "4" ]]; then
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE down
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE rm -sfv # just remove containers and volumes of the compose project
   #$DOCKER_CMD system prune -f
   #$DOCKER_CMD volume prune -f
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE up -d --build --force-recreate > /dev/null 2>&1
   echo "Customer App , built! Now, wait 10 seconds for the database to be ready."
else
   $DOCKER_COMPOSE_CMD -f $DOCKER_FILE ps
fi
