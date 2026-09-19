#!/bin/sh
# Levanta o actualiza en Swarm el ambiente del .env, sin corte. En dev
# agrega docker-compose.dev.yml (Vite con el codigo montado)
#   sh deploy/docker/desplegar.sh
#   IMAGE_TAG=sha-1a2b3c4 sh deploy/docker/desplegar.sh
set -eu
. "$(dirname "$0")/entorno.sh"

set -- -c docker-compose.yml
if [ "$APP_ENV" = dev ]; then
  set -- "$@" -c docker-compose.dev.yml
fi

docker stack deploy --with-registry-auth --detach=false "$@" "pilotssh_web_${APP_ENV}"
