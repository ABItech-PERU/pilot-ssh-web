# Variables de entorno

La web lee un solo archivo: `.env`, en la carpeta del proyecto. Cada ambiente
(desarrollo, pruebas, producción) tiene su carpeta y su `.env`. En el
repositorio solo está `.env.example`.

```bash
cp .env.example .env
```

**Se leen al arrancar, no al compilar.** En desarrollo las lee Vite; en `uat`
y `prd`, el arranque del contenedor. Por eso una sola imagen sirve a todos los
ambientes: ver [deployment.md](deployment.md).

`APP_ENV` y `APP_API_URL` van a `/config.js`, que descarga el navegador:
**nunca** una clave ni un secreto.

## Aplicación

| Variable       | Qué es                                                                       | Ejemplo                   |
| -------------- | ---------------------------------------------------------------------------- | ------------------------- |
| `APP_ENV`      | El ambiente, igual que `APP_ENV` en la API. **Obligatoria**                  | `dev`, `uat` o `prd`      |
| `APP_API_URL`  | Dónde está la API. Vacía en `dev`: Vite la sirve por su proxy                | `https://api.pilotssh.pe` |
| `APP_SITE_URL` | Dónde está la web. Para los enlaces de Google y la vista previa al compartir | `https://app.pilotssh.pe` |

Fuera de `dev`, `APP_API_URL` y `APP_SITE_URL` tienen que ser orígenes
públicos con `https`, sin ruta: si no, el contenedor no arranca y el registro
dice cuál falla.

## Prerenderizado

| Variable            | Qué es                                                                                                                      | Ejemplo                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `PRERENDER_API_URL` | Opcional. Otra dirección para leer la API al prerenderizar, si desde ahí no se alcanza la pública. Vacía, usa `APP_API_URL` | `http://localhost` (en desarrollo, dentro del contenedor, por el proxy de Vite) |

## Docker

| Variable         | Qué es                                                                                  | Ejemplo                                           |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `IMAGE_TAG`      | La versión de la imagen que se despliega. Vacía, la del ambiente (`uat` o `prd`)        | `sha-1a2b3c4`                                     |
| `WEB_PORT`       | Puerto que publica el servicio. Uno por ambiente. En un servidor, CloudPanel apunta ahí | `5190` en `dev`, `8192` en `uat`, `8092` en `prd` |
| `IMAGE_REGISTRY` | Opcional. De dónde se bajan las imágenes                                                | `ghcr.io/abitech-peru`                            |

## Qué cambia con el ambiente

|                                | `dev`                  | `uat`                                    | `prd`                 |
| ------------------------------ | ---------------------- | ---------------------------------------- | --------------------- |
| Dónde corre                    | Docker Swarm, con Vite | Docker Swarm                             | Docker Swarm          |
| `APP_API_URL` · `APP_SITE_URL` | Vacías: proxy de Vite  | Públicas, con `https`                    | Públicas, con `https` |
| Franja «Ambiente de pruebas»   | No                     | Sí                                       | No                    |
| Google                         | —                      | `noindex`, `robots.txt` que bloquea todo | Indexa, con sitemap   |

## En desarrollo

`APP_API_URL` va vacía: el proxy de Vite sirve `/api`, `/media` y `/ws`.
`APP_SITE_URL` puede ir vacía.

`npm run prerender` (`node --env-file=.env scripts/prerender.mjs`) solo hace
falta para ver las páginas prerenderizadas en local. Pide `APP_SITE_URL` y una
API alcanzable: ver [desarrollo.md](desarrollo.md).
