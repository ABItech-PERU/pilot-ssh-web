#!/bin/sh
# Levanta sin corte el ambiente del .env; en local, Vite con el codigo montado
#   sh deploy/docker/desplegar.sh
set -eu
. "$(dirname "$0")/entorno.sh"

set -- -c docker-compose.yml
if [ "$APP_ENV" = local ]; then
  set -- "$@" -c docker-compose.local.yml
fi

docker stack deploy --with-registry-auth --detach=false "$@" "pilotssh_web_${APP_ENV}"
