# Docker

Cómo levantar la web con Docker en cualquier servidor. La otra forma, subir
`dist/` a un sitio estático, está en el [README](../README.md#publicar).

## Qué se levanta

`docker compose up -d --build` crea `pilotssh_web_<VITE_APP_ENV>` con un solo
contenedor, `pilotssh_web_<ambiente>_app`: nginx sirviendo la web compilada,
con la CSP, la caché y las cabeceras de seguridad ya puestas.

Escucha en `127.0.0.1:WEB_PORT`. El HTTPS lo pone lo que haya delante, igual
que en la API: ver [su guía](../../pilot-ssh-api/docs/docker.md#https).

## La imagen es de un ambiente

Lo que empieza por `VITE_` queda dentro del JavaScript al compilar. Por eso:

- se compila una imagen por ambiente (`pilotssh-web:uat`, `pilotssh-web:prd`);
- cambiar una `VITE_` es volver a compilar: `docker compose up -d --build`.

## Primera vez

1. **La API de ese ambiente, arriba.** La compilación le pide el contacto, la
   empresa y los precios para escribirlos en las páginas.

2. **El `.env`.**

   ```bash
   cp .env.example .env
   ```

   | Variable                         | Valor                                                                   |
   | -------------------------------- | ----------------------------------------------------------------------- |
   | `VITE_APP_ENV`                   | `uat` o `prd`                                                           |
   | `VITE_API_URL` · `VITE_SITE_URL` | Las direcciones públicas, con `https`                                   |
   | `PRERENDER_API_URL`              | Solo si desde el servidor no se alcanza la API por su dirección pública |
   | `WEB_PORT`                       | Un puerto libre por ambiente                                            |

3. **Levantar.**

   ```bash
   docker compose up -d --build
   ```

   **Debe salir:** una línea por página compilada (`/pricing → pricing.html`)
   y el contenedor en `running`.

## Día a día

| Para                           | Comando                                    |
| ------------------------------ | ------------------------------------------ |
| Actualizar a una versión nueva | `git pull && docker compose up -d --build` |
| Ver el registro                | `docker compose logs -f web`               |
| Parar                          | `docker compose down`                      |

## GitHub Actions

El flujo y su configuración son los de la API: ver
[su guía](../../pilot-ssh-api/docs/github-actions.md).

## Variables solo de Docker

| Variable           | Qué es                            | Por defecto                   |
| ------------------ | --------------------------------- | ----------------------------- |
| `WEB_PORT`         | Puerto en el servidor             | `8092`                        |
| `WEB_BIND_ADDRESS` | En qué dirección escucha          | `127.0.0.1`                   |
