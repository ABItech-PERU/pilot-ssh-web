# Pilot SSH — Frontend

Landing pública, login y panel privado en una sola aplicación.

`Vite 8` · `React 19` · `TypeScript 6` · `Tailwind 4` · `shadcn/ui` · `React Query 5`

---

## Índice

| Quiero...             | Ir a                            |
| --------------------- | ------------------------------- |
| Instalarlo desde cero | [Instalación](#instalación)     |
| Solo arrancarlo       | [Arrancar](#arrancar)           |
| Subirlo a un servidor | [Publicar](#publicar)           |
| Ver las rutas         | [Rutas](#rutas)                 |
| Resolver un error     | [Si algo falla](#si-algo-falla) |

---

## Requisitos

| Necesitas             | Cómo lo compruebas              |
| --------------------- | ------------------------------- |
| Node 20.11+           | `node --version`                |
| El backend en el 8000 | Abre http://localhost:8000/api/ |

Sin backend la aplicación arranca, pero el login responde que no hay conexión.

---

## Instalación

> **Solo la primera vez.** Todo desde la carpeta `pilot-ssh-web/`.
> Al terminar el paso 3 pasas a [Arrancar](#arrancar) y no vuelves aquí.

1. **Instalar dependencias**

   ```powershell
   npm install
   ```

   **Debe salir:** `added N packages ... found 0 vulnerabilities`

2. **Crear el `.env`**

   ```powershell
   Copy-Item .env.example .env
   ```

   Tal cual sirve para desarrollar: `VITE_API_URL` vacía hace que el proxy de
   Vite reenvíe `/api` y `/ws` al backend en el 8000, sin CORS. Cada variable
   está en [Variables de entorno](docs/entorno.md). Para levantarla con
   Docker, [docs/docker.md](docs/docker.md), y para desplegarla sola con
   GitHub Actions, [docs/github-actions.md](docs/github-actions.md).

3. **Comprobar que compila**

   ```powershell
   npm run typecheck
   ```

   **Debe salir:** nada. Sin salida no hay errores de tipos.

---

### Fin de la instalación

No repitas nada de lo anterior. De aquí en adelante solo usas [Arrancar](#arrancar).

---

## Arrancar

- **En local** — recarga sola al cambiar código

  ```powershell
  npm run dev
  ```

  **Debe salir:** `➜  Local:   http://localhost:5173/`

`npm run build` no funciona con el `.env` de desarrollo: exige las
direcciones públicas y con `https`. Se compila en la carpeta de cada ambiente,
ver [Publicar](#publicar).

Para detenerlo: `Ctrl + C`

**Para entrar:** cualquier cuenta de `seed_demo` del backend. Contraseña
`12345678` para todas.

Las del personal —`soporte@`, `finanzas@` y `direccion@pilotssh.pe`— piden
además el código de dos pasos, que no llega al correo porque sus direcciones
son inventadas. Se pide en la carpeta del backend:

```powershell
python manage.py demo_code finanzas@pilotssh.pe
```

---

## Publicar

La aplicación es **un sitio estático en su propio dominio**
(`app.tudominio.com`) y la API va en el suyo (`api.tudominio.com`), con su
receta en `pilot-ssh-api/docs/deployment.md`. Este nginx no reenvía nada:
`/api`, el WebSocket de las terminales y las subidas de archivos van directo
al de la API, que ya tiene lo que necesitan —terminales abiertas hasta 24 h
sin actividad y subidas de hasta 20 MB—. Reenviarlos también desde aquí eran
dos configuraciones que había que mantener iguales, y la de aquí cortaba las
terminales al minuto sin actividad.

**Las páginas públicas salen ya escritas en HTML** (`/`, `/pricing`,
`/security`, `/terms`, `/privacy`), con su título, descripción, vista previa
para compartir y datos para Google: los buscadores y WhatsApp, Facebook o
LinkedIn no ejecutan JavaScript. El panel es `app.html`, con `noindex`.

1. **Compilar**

   **Primero la API**, ya desplegada: la compilación le pide el contacto, la
   empresa y los precios (`/api/site` y `/api/pricing`) para escribirlos en el
   HTML.

   En la carpeta del ambiente, su `.env`:

   ```env
   VITE_APP_ENV=prd
   VITE_API_URL=https://api.tudominio.com
   VITE_SITE_URL=https://app.tudominio.com
   ```

   Para pruebas, `VITE_APP_ENV=uat` con sus direcciones: la web muestra
   la franja «Ambiente de pruebas» y pide a Google no indexarla.

   ```bash
   npm ci
   npm run build
   ```

   **Debe salir:** `✓ built in …`, una línea por página (`/pricing →
pricing.html`) y `sitemap.xml, robots.txt, app.html`. No hace falta Node en
   el servidor: se suben los archivos de `dist/`.

   **Se incrustan al compilar:** cambiarlas es volver a compilar. Vacías, con
   `http://` o con `localhost`, `npm run build` se detiene y dice por qué.
   Si desde donde compila la API no se alcanza por su dirección pública,
   `PRERENDER_API_URL` le dice otra.

   **Cambiar el contacto, la empresa o los precios** no pide compilar: la web
   los vuelve a pedir al cargar. Sí conviene recompilar pronto, para que
   Google y las vistas previas vean los nuevos.

2. **La API tiene que aceptar este origen.** En el `.env` de la API:

   | Variable                | Valor                                                        |
   | ----------------------- | ------------------------------------------------------------ |
   | `SECURITY_CORS_ORIGINS` | `https://app.tudominio.com`                                  |
   | `APP_WEB_URL`           | `https://app.tudominio.com`, para los enlaces de los correos |

3. **El sitio en CloudPanel.** _Add Site → Create a Static HTML Site_ con
   `app.tudominio.com`, y su certificado en _SSL/TLS_. Suba `dist/` a
   `htdocs/app.tudominio.com/dist`. En la pestaña **Vhost**, el `root` apunta
   a esa carpeta, el `map` va antes de `server {` y el resto dentro, en lugar
   de sus bloques `location`:

   ```nginx
   # Antes de `server {`. Lo que lleva hash en el nombre no cambia nunca; el
   # resto se revalida, o un despliegue tardaria en verse
   map $uri $pilotssh_cache {
     ~^/assets/  "public, max-age=31536000, immutable";
     default     "no-cache";
   }
   ```

   ```nginx
   root /home/usuario_sitio/htdocs/app.tudominio.com/dist;
   index index.html;

   # En el servidor y no en cada location: un add_header dentro de una
   # location borra todos los de fuera
   add_header Cache-Control $pilotssh_cache always;
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-Frame-Options "DENY" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
   # Un nonce por respuesta: el antifraude de Mercado Pago inyecta un script
   # en linea y solo corre con el. index.html lo lee de su <meta csp-nonce>
   sub_filter '__CSP_NONCE__' $request_id;
   sub_filter_once on;
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-$request_id' https://sdk.mercadopago.com https://http2.mlstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://api.tudominio.com https://*.mlstatic.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com; connect-src 'self' https://api.tudominio.com wss://api.tudominio.com https://*.mercadopago.com https://*.mercadolibre.com https://http2.mlstatic.com; frame-src blob: https://*.mercadopago.com https://*.mercadolibre.com; object-src blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;

   # /pricing sirve pricing.html; lo demás es del panel, que se enruta en el navegador
   location / {
     try_files $uri $uri.html $uri/ /app.html;
   }

   # Un archivo de una version anterior no es la aplicacion: 404, no index.html
   location /assets/ {
     try_files $uri =404;
   }
   ```

   Cambie `api.tudominio.com` en `Content-Security-Policy` por el dominio de
   la API: en `img-src` (avatares), `connect-src` (peticiones y terminales).

   `sub_filter` es del módulo `ngx_http_sub_module`, que trae el nginx de
   CloudPanel (`nginx -V 2>&1 | grep -o http_sub_module`). Sin él, el
   formulario de pago no se pinta.

   Guarde y compruébelo:

   ```bash
   curl -sI https://app.tudominio.com/app/servers | grep -iE "^HTTP|content-security|cache-control"
   curl -s https://app.tudominio.com/ | grep csp-nonce
   ```

   **Debe salir:** `200`, la política con `'nonce-…'`, `cache-control: no-cache`,
   y en la página el mismo nonce en lugar de `__CSP_NONCE__`, distinto en cada
   petición.

4. **Google.** En [Search Console](https://search.google.com/search-console),
   añada `app.tudominio.com` y envíe `https://app.tudominio.com/sitemap.xml`.
   La vista previa al compartir se comprueba en el
   [depurador de Facebook](https://developers.facebook.com/tools/debug/) y los
   datos estructurados en la
   [prueba de resultados enriquecidos](https://search.google.com/test/rich-results).

   Las páginas públicas posicionan mejor en el dominio raíz que en un
   subdominio. Si publica en `app.`, apunte también `tudominio.com` a esta
   misma carpeta: el `canonical` de cada página manda, y ahí debe ir el
   dominio que quiere posicionar (`VITE_SITE_URL`).

### Marca

El símbolo es un solo trazo: el chevron del prompt que baja y sigue como
cola; en el imagotipo la cola llega hasta la L de PILOT. Los SVG de
`public/marca/` son la única fuente: `isotipo` (el símbolo), `logotipo` (la
palabra, ya en trazados: no depende de la fuente), `imagotipo` (los dos
juntos), `etiqueta` y `apilado`, en versión oscura y clara, más el imagotipo
de una tinta. `scripts/dibujar-marca.py` los dibuja (pide `fonttools`,
`brotli` y `uharfbuzz`, y descarga Inter 800); de ellos salen los PNG y WebP
de esa carpeta, `favicon.svg`, `apple-touch-icon.png` e `icon-512.png`:

| Uso                                                     | Archivo                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| Web, correos, documentos: la marca principal            | `imagotipo-*`                                         |
| Espacios estrechos (SSH pasa a un distintivo)           | `etiqueta-*`                                          |
| Publicaciones cuadradas y portadas                      | `apilado-*`                                           |
| Foto de perfil (el recorte circular respeta el símbolo) | `avatar-512.png`                                      |
| Pestaña y pantalla de inicio                            | `favicon.svg`, `apple-touch-icon.png`, `icon-512.png` |
| Para quien haga una pieza (diseñador, imprenta)         | `manual-de-marca.png`                                 |

Una sola marca principal en el producto: las variantes son para donde la
principal no cabe, no alternativas.

```bash
python scripts/dibujar-marca.py          # solo si cambia el trazo o la palabra
node scripts/exportar-marca.mjs
node scripts/imagen-para-compartir.mjs   # og.png, la vista previa al compartir
node scripts/manual-de-marca.mjs         # marca/manual-de-marca.png: colores, letra y reglas
```

Los correos cargan `marca/imagotipo-oscuro.png` desde `APP_WEB_URL`: Outlook y
Gmail no muestran SVG ni WebP. La cabecera de la web y del panel enseñan el
SVG del imagotipo tal cual, y `BrandMark` copia el trazo del isotipo. Las capturas del panel que enseña
la web (`src/assets/panel-*.webp`) son reales: el panel con los datos de
`seed_demo`, en oscuro, a 1280 px y escala 2, recortadas y guardadas en WebP
de calidad 82. Al cambiar el diseño del panel, vuelva a tomarlas.

### Qué protege cada cabecera

| Cabecera                                     | Qué evita                                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`                    | Que un script inyectado se ejecute o mande datos fuera: solo corre el código de este dominio y el del formulario de pago de Mercado Pago, y solo se habla con la API y con Mercado Pago |
| `frame-ancestors 'none'` · `X-Frame-Options` | Que otra web meta el panel en un marco para que alguien pulse sin saberlo                                                                                                               |
| `Strict-Transport-Security`                  | Que el navegador vuelva a entrar por `http://`                                                                                                                                          |
| `X-Content-Type-Options`                     | Que un archivo se ejecute como otro tipo                                                                                                                                                |
| `Referrer-Policy`                            | Que la ruta del panel viaje a otros sitios al salir                                                                                                                                     |
| `Permissions-Policy`                         | Cámara, micrófono y ubicación: la aplicación no los usa                                                                                                                                 |

**Si algo deja de cargar**, la consola del navegador dice qué bloqueó la
política (`Refused to …`). No se usa `'unsafe-inline'` en scripts: el tema se
aplica desde `public/tema.js`, zod valida sin `eval` (`lib/zod-sin-eval.ts`) y
el único script en línea, el del antifraude de Mercado Pago, lleva el nonce. En
estilos sí, porque el formulario de pago y los diálogos insertan los suyos.

La lista de Mercado Pago no está en su documentación: sale de lo que su SDK
carga al pintar tarjeta, PagoEfectivo y Yape, comprobado con la política
puesta. `blob:` en `frame-src` y `object-src` es para ver el comprobante en
PDF.

---

## Rutas

Una sola aplicación y un solo dominio. Lo que separa lo público de lo privado
es el árbol de rutas.

| Ruta                                                                      | Layout                            | Quién entra              |
| ------------------------------------------------------------------------- | --------------------------------- | ------------------------ |
| `/` · `/pricing` · `/security` · `/terms` · `/privacy`                    | `PublicLayout`, compiladas a HTML | Cualquiera               |
| `/login` · `/register`                                                    | `GuestLayout`                     | Solo quien no ha entrado |
| `/onboarding`                                                             | _(propio)_                        | Autenticado              |
| `/app/servers` · `/app/credentials`                                       | `AppLayout`                       | Autenticado              |
| Barra lateral: plegable en escritorio, cajón a pantalla completa en móvil | `AppSidebar`                      | —                        |
| `/app/servers/:id` y sus pestañas `credentials`, `accesses`, `sessions`   | `AppLayout`                       | Autenticado              |
| `/app/credits` y sus pestañas `transactions`, `usage`, `topups`           | `AppLayout`                       | Autenticado              |
| `/app/credentials/:id`                                                    | `AppLayout`                       | Autenticado              |
| `/app/organization`                                                       | `AppLayout`                       | Autenticado              |
| `/app/*`                                                                  | `AppLayout`                       | Autenticado              |
| `/app/servers/:id/terminal`                                               | _(propio, pantalla entera)_       | Autenticado              |

Todo lo de `/app` se carga aparte: quien solo abre la landing no descarga el
panel.

**Los guards son comodidad, no seguridad.** Quien decide qué ve cada quien es
el backend, en cada petición.

---

## Si algo falla

| Error                                                                   | Por qué                                                | Cómo se arregla                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `No pudimos conectar con el servidor`                                   | El backend está apagado                                | Arráncalo desde `pilot-ssh-api/`                                                   |
| `Tu sesión expiró` nada más entrar                                      | El refresh caducó                                      | Vuelve a entrar; si sigue, borra `pilotssh.session` del almacenamiento             |
| `CORS policy` en la consola                                             | El frontend pide a otro dominio                        | Deja `VITE_API_URL` vacío, o añade el origen a `SECURITY_CORS_ORIGINS` del backend |
| Cambiaste `VITE_API_URL` y sigue igual                                  | Se incrusta al compilar                                | Compila otra vez                                                                   |
| `VITE_API_URL tiene que ser la dirección pública de la API` al compilar | El `.env` apunta a `localhost` o le falta la dirección | Ver [Publicar](#publicar), paso 1                                                  |
| 404 al recargar en `/app/servers`                                       | Falta el fallback a `app.html`                         | Ver [Publicar](#publicar), paso 3                                                  |
| `La API no responde en …` al compilar                                   | La compilación lee contacto y precios de la API        | Despliegue antes la API, o `PRERENDER_API_URL`                                     |
| `Refused to load …` o `Refused to connect …` en la consola              | La política de contenido no tiene ese dominio          | El dominio de la API en `img-src` y `connect-src`. Ver [Publicar](#publicar)       |
| `Port 5173 is already in use`                                           | Ya hay un Vite corriendo                               | `npm run dev -- --port 5174`                                                       |
| La página sale en blanco                                                | React no arrancó                                       | Mira la consola del navegador, no la terminal                                      |

---

## Referencia

| Comando                                     | Para qué                                    |
| ------------------------------------------- | ------------------------------------------- |
| `npm run dev`                               | Desarrollo con recarga                      |
| `npm run build`                             | Tipos y compilación a `dist/`               |
| `npm run preview`                           | Servir `dist/`                              |
| `npm run typecheck`                         | Solo los tipos                              |
| `npm test`                                  | Pruebas                                     |
| `npm run ui:scroll`                         | Busca scrolls no deseados en el navegador   |
| `npm run ui:shot <carpeta> [ruta] [--auth]` | Capturas en claro/oscuro y escritorio/móvil |
| `npx shadcn@latest add <componente>`        | Añadir un componente                        |

```
pilot-ssh-web/
├── src/
│   ├── features/       # un dominio por carpeta: api.ts + pantallas
│   │   ├── sitio/      # landing, precios y seguridad
│   │   ├── legal/      # términos y privacidad
│   │   ├── auth/       # sesión, login, registro, onboarding
│   │   ├── organizations/
│   │   └── servers/
│   ├── layouts/        # PublicLayout, GuestLayout, AppLayout
│   ├── routes/         # rutas y guards
│   ├── components/ui/  # shadcn generado: no se edita a mano
│   ├── lib/            # http, errores, formato
│   ├── types/api.ts    # contrato con el backend
│   └── index.css       # tokens de color y tipografía
├── .env                # el de este ambiente; no se sube a git
├── .env.example        # la plantilla, con las mismas variables
└── vite.config.ts      # proxy, alias, chunks
```

---

## Aviso

Todo lo que entra por `VITE_*` viaja al navegador y es **público**. Ahí va la
URL de la API y nada más.
