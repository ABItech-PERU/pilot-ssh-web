# Pilot SSH Web

Sitio público y panel de Pilot SSH: servidores, accesos por equipo y terminal SSH en el navegador.

[![uat](https://img.shields.io/github/actions/workflow/status/ABItech-PERU/pilot-ssh-web/deploy-uat.yml?branch=main&style=flat&label=uat)](https://github.com/ABItech-PERU/pilot-ssh-web/actions/workflows/deploy-uat.yml)
[![Licencia](https://img.shields.io/badge/licencia-propietaria-555?style=flat)](LICENSE)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/imagenes/inicio-oscuro.png">
  <img alt="Página de inicio de Pilot SSH: el acceso de una persona a un servidor, su sesión en la terminal y el registro" src="docs/imagenes/inicio-claro.png">
</picture>

## Características

- Sitio público con inicio, precios, seguridad y páginas legales, prerenderizado para buscadores y vistas previas.
- Panel de cada organización: servidores, credenciales, equipo, accesos, auditoría y créditos.
- Terminal SSH en el navegador con xterm.js, que se reconecta cuando la API se actualiza.
- Recargas con Mercado Pago (tarjeta, Yape y PagoEfectivo) sin salir del panel.
- Panel de plataforma para soporte, finanzas y operaciones del personal.

## Requisitos

| Herramienta                                                    | Versión                |
| -------------------------------------------------------------- | ---------------------- |
| Docker Desktop, con Swarm activo                               | Docker Engine 29       |
| Git Bash                                                       | el de Git para Windows |
| [Pilot SSH API](https://github.com/ABItech-PERU/pilot-ssh-api) | levantada en local     |

La imagen usa Node 26.13, React 19, TypeScript 6, Vite 8 y Tailwind 4; no
hace falta instalarlos en la máquina.

## Inicio rápido

```bash
cp .env.example .env
sh deploy/docker/desplegar.sh
```

La web queda en `http://localhost:5190`. La guía paso a paso está en
[docs/desarrollo.md](docs/desarrollo.md).

## Uso

| Comando                         | Para qué                                                  |
| ------------------------------- | --------------------------------------------------------- |
| `sh deploy/docker/desplegar.sh` | Levantar o actualizar la web en local, sin corte          |
| `sh deploy/docker/pruebas.sh`   | Comprobar los tipos y correr las pruebas en el contenedor |

## Ambientes

| Ambiente | Cómo llega                         | Dónde corre           |
| -------- | ---------------------------------- | --------------------- |
| `local`  | `sh deploy/docker/desplegar.sh`    | la PC de cada persona |
| `uat`    | cada merge a `main`                | servidor de pruebas   |
| `prod`   | una etiqueta `vX.Y.Z` sobre `main` | producción            |

Los tres usan el mismo `docker-compose.yml` y la misma imagen; cada uno la
configura al arrancar con su `.env`.

## Documentación

| Quiero…                                         | Documento                                   |
| ----------------------------------------------- | ------------------------------------------- |
| Programar en mi PC                              | [desarrollo.md](docs/desarrollo.md)         |
| Instalarla en un servidor                       | [deployment.md](docs/deployment.md)         |
| Configurar el despliegue automático             | [github-actions.md](docs/github-actions.md) |
| Saber qué va en el `.env`                       | [entorno.md](docs/entorno.md)               |
| Entender rutas, prerenderizado, SEO y cabeceras | [arquitectura.md](docs/arquitectura.md)     |
| Usar o regenerar la marca                       | [marca.md](docs/marca.md)                   |

## Estructura

```text
src/features/     un dominio por carpeta: su api.ts y sus pantallas
src/layouts/      PublicLayout, GuestLayout, AppLayout y PlatformLayout
src/routes/       rutas y guardas
src/components/   piezas compartidas; ui/ es shadcn
src/lib/          http, errores y formato; env.ts lee config.js
public/           marca, favicon y tema.js
scripts/          prerenderizado y utilidades
deploy/docker/    nginx, arranque y scripts de despliegue y pruebas
docs/             documentación
```

## Contribuir

Ramas cortas desde `main` (`feature/*`, `fix/*`) y PR con la CI en verde.
Antes de abrir el PR, `sh deploy/docker/pruebas.sh` sin errores.

## Licencia

Propietaria. Copyright (c) 2026 ABItech Perú. Todos los derechos
reservados; los términos están en [LICENSE](LICENSE).
