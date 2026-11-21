#!/bin/sh
# Prepara la web para el ambiente del .env: config.js, páginas públicas y
# CSP. Sin la API no arranca, y Swarm mantiene la versión anterior
set -eu
cd /opt/pilotssh
node scripts/prerender.mjs

api="${APP_API_URL%/}"
socket="$(printf '%s' "$api" | sed 's#^http#ws#')"
sed -e "s#__API_URL__#${api}#g" -e "s#__API_WS_URL__#${socket}#g" \
  nginx.conf > /etc/nginx/conf.d/default.conf
