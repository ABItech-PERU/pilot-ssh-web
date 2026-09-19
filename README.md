# Pilot SSH · Web

Interfaz de **Pilot SSH**: el sitio público y el panel donde los equipos
gestionan sus servidores, credenciales y accesos, y abren la terminal SSH en
el navegador.

`React 19` · `TypeScript 6` · `Vite 8` · `Tailwind 4` · `shadcn/ui` · `TanStack Query 5` · `xterm.js` · `Docker Swarm`

Consume la API del proyecto hermano [`pilot-ssh-api`](../pilot-ssh-api).

---

## Qué incluye

| Parte             | Qué es                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| **Sitio público** | Inicio, precios, seguridad y páginas legales, en HTML ya escrito para Google y las vistas previas al compartir |
| **Panel**         | Servidores, credenciales, equipo, accesos, auditoría y créditos de cada organización                           |
| **Terminal**      | SSH en el navegador con xterm.js; se reconecta sola si la API se actualiza                                     |
| **Recargas**      | Pago con Mercado Pago (tarjeta, Yape, PagoEfectivo) sin salir del panel                                        |
| **Plataforma**    | Panel del personal de Pilot SSH (soporte, finanzas y operaciones)                                              |

Más detalle en [docs/arquitectura.md](docs/arquitectura.md).

---

## Empezar

Necesita **Docker Desktop**, una terminal **Git Bash** y la
[API de desarrollo](../pilot-ssh-api/docs/desarrollo.md) levantada. En la
carpeta `pilot-ssh-web/`:

```bash
cp .env.example .env
sh deploy/docker/desplegar.sh       # la web en http://localhost:5190
```

La guía completa, paso a paso: **[docs/desarrollo.md](docs/desarrollo.md)**.

---

## Documentación

| Quiero…                                                      | Documento                                   |
| ------------------------------------------------------------ | ------------------------------------------- |
| Programar en mi PC                                           | [desarrollo.md](docs/desarrollo.md)         |
| Instalarla en un servidor                                    | [deployment.md](docs/deployment.md)         |
| Configurar el despliegue automático                          | [github-actions.md](docs/github-actions.md) |
| Saber qué va en el `.env`                                    | [entorno.md](docs/entorno.md)               |
| Entender rutas, prerenderizado, SEO y cabeceras de seguridad | [arquitectura.md](docs/arquitectura.md)     |
| Usar o regenerar la marca                                    | [marca.md](docs/marca.md)                   |

---

## Ambientes

| Ambiente | Rama      | Dónde corre         |
| -------- | --------- | ------------------- |
| `dev`    | `develop` | Su PC               |
| `uat`    | `staging` | Servidor de pruebas |
| `prd`    | `main`    | Producción          |

Los tres usan el mismo `docker-compose.yml` y la misma imagen: al arrancar,
cada ambiente la configura con su `.env`.

---

## Estructura

```
pilot-ssh-web/
├── src/
│   ├── features/           # un dominio por carpeta: su api.ts y sus pantallas
│   ├── layouts/            # PublicLayout, GuestLayout, AppLayout, PlatformLayout
│   ├── routes/             # rutas y guards
│   ├── components/         # piezas compartidas; ui/ es shadcn
│   ├── lib/                # http, errores, formato; env.ts lee config.js
│   └── index.css           # colores y tipografía
├── public/                 # marca, favicon, tema.js
├── scripts/                # prerenderizado y utilidades
├── deploy/docker/          # nginx, arranque y scripts: desplegar, pruebas
├── docs/                   # documentación
├── docker-compose.yml      # el stack de Swarm: dev, uat y prd
├── docker-compose.dev.yml  # solo dev: Vite con el código montado
├── Dockerfile
└── vite.config.ts
```

---

© ABItech Perú. Uso privado.
