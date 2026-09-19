# Variables de entorno

La web lee un solo archivo: `.env`, en la carpeta del proyecto. Cada ambiente
(desarrollo, pruebas, producción) se compila en su propia carpeta con su propio
`.env`. En el repositorio solo está `.env.example`.

```bash
cp .env.example .env
```

Lo que empieza por `VITE_` queda dentro del JavaScript que descarga el
navegador: **nunca** una clave ni un secreto.

## Aplicación

| Variable        | Qué es                                                                       | Ejemplo                   |
| --------------- | ---------------------------------------------------------------------------- | ------------------------- |
| `VITE_APP_ENV`  | El ambiente, igual que `APP_ENV` en la API. **Obligatoria**                  | `dev`, `uat` o `prd`      |
| `VITE_API_URL`  | Dónde está la API. Vacía en `dev`: Vite la sirve por su proxy                | `https://api.pilotssh.pe` |
| `VITE_SITE_URL` | Dónde está la web. Para los enlaces de Google y la vista previa al compartir | `https://app.pilotssh.pe` |

## Compilación

| Variable            | Qué es                                                                                       | Ejemplo                 |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------- |
| `PRERENDER_API_URL` | Opcional. Otra dirección para leer la API al compilar, si desde ahí no se alcanza la pública | `http://127.0.0.1:8091` |

## Docker

| Variable   | Qué es                                                           | Ejemplo |
| ---------- | ---------------------------------------------------------------- | ------- |
| `WEB_PORT` | Puerto del contenedor en el servidor. Ver [docker.md](docker.md) | `8092`  |

## Qué cambia con el ambiente

|                              | `dev`                           | `uat`                  | `prd`               |
| ---------------------------- | ------------------------------- | ---------------------- | ------------------- |
| `npm run build`              | Se detiene: las URL son locales | Compila                | Compila             |
| Franja «Ambiente de pruebas» | No                              | Sí                     | No                  |
| Google                       | —                               | `noindex`, sin sitemap | Indexa, con sitemap |

Al compilar, `VITE_API_URL` y `VITE_SITE_URL` tienen que ser públicas y con
`https`: si no, `npm run build` se detiene y dice cuál falla.
