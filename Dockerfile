# Compila con Node, sirve con nginx. Una imagen por ambiente: las VITE_
# quedan dentro del JavaScript

FROM node:22-alpine AS compilacion
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_APP_ENV
ARG VITE_API_URL
ARG VITE_SITE_URL
# Lee contacto y precios de la API: tiene que estar arriba
ARG PRERENDER_API_URL
RUN npm run build
# La CSP apunta a la API de este ambiente
RUN sed -e "s#__API_URL__#${VITE_API_URL}#g" \
        -e "s#__API_WS_URL__#$(echo "${VITE_API_URL}" | sed 's#^https#wss#')#g" \
        deploy/docker/nginx.conf > /tmp/default.conf

FROM nginx:1.27-alpine
COPY --from=compilacion /tmp/default.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
