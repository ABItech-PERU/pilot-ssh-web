#!/bin/sh
# Comprueba los tipos y corre las pruebas en el contenedor de desarrollo
#   sh deploy/docker/pruebas.sh
set -eu
. "$(dirname "$0")/entorno.sh"

contenedor="$(docker ps -q -f name=pilotssh_web_dev_app | head -1)"
if [ -z "$contenedor" ]; then
  echo "La web de desarrollo no está levantada: sh deploy/docker/desplegar.sh" >&2
  exit 1
fi

docker exec "$contenedor" npm run typecheck
exec docker exec "$contenedor" npx vitest run
