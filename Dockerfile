# Una imagen para todos los ambientes: la configuración y las páginas
# públicas se generan al arrancar, con el .env (deploy/docker/arranque.sh)

FROM node:22-alpine AS compilacion
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Solo jsdom: lo único que el prerenderizado usa fuera de su bundle
FROM node:22-alpine AS prerenderizado
WORKDIR /prerender
COPY package-lock.json /tmp/
RUN version="$(node -p "require('/tmp/package-lock.json').packages['node_modules/jsdom'].version")" \
 && npm install --omit=dev --no-audit --no-fund --no-package-lock "jsdom@${version}"

FROM nginx:1.27-alpine
RUN apk add --no-cache nodejs
WORKDIR /opt/pilotssh
COPY --from=prerenderizado /prerender/node_modules node_modules
COPY --from=compilacion /app/dist dist
COPY --from=compilacion /app/dist-ssr dist-ssr
COPY scripts/prerender.mjs scripts/configuracion.mjs scripts/
COPY deploy/docker/nginx.conf nginx.conf
COPY deploy/docker/arranque.sh /docker-entrypoint.d/40-pilotssh.sh
RUN chmod +x /docker-entrypoint.d/40-pilotssh.sh \
 && rm /etc/nginx/conf.d/default.conf
EXPOSE 80
