# CLAUDE.md

**Pilot SSH — Web.** Interfaz de control de acceso a servidores: quién entra
a qué máquina, con qué credencial, y con registro de todo.

Una sola aplicación sirve la landing pública, el login y el panel privado.
No hay dos proyectos ni dos dominios: lo que separa lo público de lo privado
es el árbol de rutas.

Vite + React + TypeScript. Tailwind v4 y shadcn/ui para la interfaz;
React Query y Axios para los datos. El backend es otro proyecto con su propio
`CLAUDE.md`, en `../pilot-ssh-api`.

Idioma: español, en el código y en la pantalla. Las rutas de la URL van en
inglés, como las de la API.

**El texto que ve el usuario se escribe según `project/copy.md`:** con
tildes, con signos de apertura, con las palabras que la gente ya conoce de
otras apps, y sin una sola palabra de cómo está construido esto.

## Comandos

Todo con Docker Swarm y el mismo `docker-compose.yml` en `dev`, `uat` y `prd`;
en `dev` se suma `docker-compose.dev.yml` (Vite con el código montado). Desde
la carpeta del proyecto, en Git Bash. En local, Vite corre en
`pilotssh_web_dev_app` (http://localhost:5190), con la API de desarrollo
levantada antes (`docs/desarrollo.md`). Servidores: `docs/deployment.md`.

```bash
sh deploy/docker/desplegar.sh                          # levanta o actualiza el ambiente del .env
docker service logs -f pilotssh_web_dev_app            # registro de Vite
sh deploy/docker/pruebas.sh                            # tipos y pruebas
docker exec $(docker ps -q -f name=pilotssh_web_dev_app) npm run build   # compila a dist/ y dist-ssr/
docker stack rm pilotssh_web_dev                       # parar
npx shadcn@latest add <componente>
```

En local no hace falta CORS: el proxy de Vite sirve `/api`, `/media` y `/ws`
desde el mismo origen (`host.docker.internal:8000`, el nginx de la API de
desarrollo). En `uat` y `prd` no hay proxy.

**La compilación no depende del ambiente: una imagen para todos.** El `.env`
(`APP_ENV`, `APP_API_URL`, `APP_SITE_URL`; ver `docs/entorno.md`) se lee al
arrancar, no al compilar. `src/lib/env.ts` lee `globalThis.__PILOTSSH__` de
`/config.js`, que `index.html` carga antes que la app: en local lo sirve un
plugin de `vite.config.ts`; en Docker lo escribe `scripts/prerender.mjs` al
arrancar el contenedor, junto con el HTML de las páginas públicas con datos de
la API. Esas páginas se cargan sin carga diferida para no parpadear.

**La web publicada lleva política de contenido (CSP) sin `'unsafe-inline'` en
scripts.** Nada de scripts en línea en `index.html`, ni `eval` (zod va con
`jitless`). Un dominio nuevo de terceros se añade a la CSP de
`deploy/docker/nginx.conf`, comprobado en el navegador con la política puesta.

## Puertas de calidad

Las dos pasan antes de entregar. Prohibido `it.skip` para que pase la suite.

```bash
sh deploy/docker/pruebas.sh
```

Corre `npm run typecheck` y `npx vitest run` en el contenedor de desarrollo.

## Estructura

| Carpeta          | Responsabilidad                                  |
| ---------------- | ------------------------------------------------ |
| `features/`      | Un dominio por carpeta: `api.ts` y sus pantallas |
| `layouts/`       | Los tres armazones: público, invitado, panel     |
| `routes/`        | Árbol de rutas y guards                          |
| `components/ui/` | shadcn generado: **no se edita a mano**          |
| `components/`    | Composición propia sobre `ui/`                   |
| `lib/`           | Cliente HTTP, errores, formato                   |
| `types/api.ts`   | Contrato con el backend                          |

`features` importa de `lib`, `components` y `types`; nunca al revés.

## Reglas

En `.claude/rules/`, se cargan solas según el archivo que toques.
Precedencia: `core/` → `tech/` → `project/`. Los `project/` no conceden
excepciones de seguridad.

`core/*` es la base global compartida con el backend: **no se edita aquí.**

| Ámbito     | Archivos                                                                            |
| ---------- | ----------------------------------------------------------------------------------- |
| `core/`    | filosofía · naming · comentarios · commits · idioma · seguridad · pruebas · errores |
| `tech/`    | react · typescript · tailwind · datos · formularios · testing                       |
| `project/` | architecture · domain · **copy** · seguridad · gotchas                              |

**Antes de tocar `.ts` o `.tsx` lee `project/gotchas.md`:** trampas que ya
costaron una sesión cada una.

Tres hooks las hacen cumplir:

| Hook                     | Cuándo                                | Qué hace                                               |
| ------------------------ | ------------------------------------- | ------------------------------------------------------ |
| `revisar_comentarios.py` | cada edición                          | Avisa de comentarios que incumplen `core/02`           |
| `recordar_contrato.py`   | al tocar `types/api.ts` o un `api.ts` | Recuerda contrastar con los serializers y la colección |
| `revisar_commit.py`      | antes de cada commit                  | **Rechaza** el mensaje si incumple `core/03`           |

## Lo que más se rompe

**`ServerUser` es una credencial (`root@10.0.0.5`), no una persona.** En
pantalla se escribe "credencial", nunca "usuario".

**Las rutas de la API no llevan barra final.** Con barra el backend responde
404, y un `POST` no tiene redirección posible.

**Toda pantalla que pide datos resuelve cuatro estados:** cargando, error,
vacío y con datos. El esqueleto imita la forma final, o el salto de layout
mueve la vista al llegar los datos.

**La organización actual va en la clave de consulta.** Sin ella, cambiar de
organización enseña los datos de la anterior.

**El guard de ruta no es control de acceso.** Quien decide es el backend, en
cada petición.

## Endpoint nuevo o cambiado

Toca **tres** sitios en el mismo trabajo, y el tercero vive fuera del repo:

1. `src/types/api.ts` — espejo del serializer
2. `src/features/<dominio>/api.ts` — la llamada y su clave
3. `_api/pilot-ssh-api-collection/` — la colección Bruno del backend

TypeScript no comprueba nada sobre la respuesta del servidor: un campo mal
declarado compila y llega como `undefined`.

## Deuda que muerde

Los tokens viven en `localStorage` porque el WebSocket exige el `access` en
la query. Un XSS se lleva la sesión; por eso `dangerouslySetInnerHTML` no se
usa nunca. La alternativa —cookie `httpOnly` más endpoint de ticket— está
pendiente.

**El nivel de acceso lo dice el backend, no el rol.** Cada servidor y cada
credencial traen `access_level` —`view`, `connect` o `manage`— y la pantalla
esconde lo que va a responder `403`: sin `manage` no hay «Editar» ni
«Eliminar», sin `connect` no hay «Abrir terminal». El guard sigue sin ser
control de acceso: quien decide es el backend, en cada petición.
