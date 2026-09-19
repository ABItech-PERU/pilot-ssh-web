# Arquitectura

Cómo está armada la web: una sola aplicación para el sitio público y el
panel, qué se prerenderiza y qué protege cada cabecera.

## Una aplicación, dos partes

| Parte         | Rutas                                                  | Cómo se sirve                                                                             |
| ------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Sitio público | `/` · `/pricing` · `/security` · `/terms` · `/privacy` | HTML ya escrito (prerenderizado), para Google y las vistas previas al compartir           |
| Acceso        | `/login` · `/register` · `/onboarding`                 | La aplicación, sin índice (`noindex`)                                                     |
| Panel         | `/app/*` · `/backoffice/*`                             | La aplicación (`app.html`), cargada aparte: quien solo abre el sitio no descarga el panel |

**Los guards son comodidad, no seguridad.** Quien decide qué ve cada quien es
la API, en cada petición.

<details>
<summary><strong>Todas las rutas</strong></summary>

| Ruta                                                                    | Layout                      | Quién entra                          |
| ----------------------------------------------------------------------- | --------------------------- | ------------------------------------ |
| `/` · `/pricing` · `/security` · `/terms` · `/privacy`                  | `PublicLayout`              | Cualquiera                           |
| `/login` · `/register`                                                  | `GuestLayout`               | Solo quien no ha entrado             |
| `/onboarding`                                                           | _(propio)_                  | Autenticado                          |
| `/app/servers` · `/app/credentials`                                     | `AppLayout`                 | Autenticado                          |
| `/app/servers/:id` y sus pestañas `credentials`, `accesses`, `sessions` | `AppLayout`                 | Autenticado                          |
| `/app/credits` y sus pestañas `transactions`, `usage`, `topups`         | `AppLayout`                 | Autenticado                          |
| `/app/credentials/:id`                                                  | `AppLayout`                 | Autenticado                          |
| `/app/organization`                                                     | `AppLayout`                 | Autenticado                          |
| `/app/servers/:id/terminal`                                             | _(propio, pantalla entera)_ | Autenticado                          |
| `/backoffice/*`                                                         | `PlatformLayout`            | Personal de Pilot SSH, con dos pasos |

</details>

## Una sola imagen para todos los ambientes

`npm run build` no depende del ambiente. Al arrancar, el contenedor
(`deploy/docker/arranque.sh`):

1. Lee su `.env` y valida `APP_ENV`, `APP_API_URL` y `APP_SITE_URL`.
2. Pide a la API el contacto, la empresa y los precios (`/api/site`, `/api/pricing`).
3. Escribe `config.js`, las páginas públicas, `robots.txt` y, en `prd`, `sitemap.xml`.
4. Pone la dirección de la API en la CSP de nginx.

Si la API no responde, el contenedor no arranca y Swarm mantiene la versión
anterior. Cambiar el contacto o los precios no pide desplegar: la web los
vuelve a pedir al cargar; Google los ve en el siguiente arranque.

`config.js` es **público**: solo lleva el ambiente y la dirección de la API.

## SEO

- En `uat` las páginas llevan `noindex` y `robots.txt` bloquea todo.
- En `prd`, añada el dominio en [Search Console](https://search.google.com/search-console)
  y envíe `https://<dominio>/sitemap.xml`.
- El `canonical` de cada página usa `APP_SITE_URL`: ahí va el dominio que se
  quiere posicionar. El dominio raíz posiciona mejor que un subdominio.
- Vista previa al compartir: [depurador de Facebook](https://developers.facebook.com/tools/debug/).
  Datos estructurados: [prueba de resultados enriquecidos](https://search.google.com/test/rich-results).

## Cabeceras de seguridad

Las pone el nginx del contenedor (`deploy/docker/nginx.conf`):

| Cabecera                                     | Qué evita                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`                    | Que un script inyectado se ejecute o mande datos fuera: solo corre el código de este dominio y el de Mercado Pago, y solo se habla con la API y con Mercado Pago |
| `frame-ancestors 'none'` · `X-Frame-Options` | Que otra web meta el panel en un marco para que alguien pulse sin saberlo                                                                                        |
| `Strict-Transport-Security`                  | Que el navegador vuelva a entrar por `http://`                                                                                                                   |
| `X-Content-Type-Options`                     | Que un archivo se ejecute como otro tipo                                                                                                                         |
| `Referrer-Policy`                            | Que la ruta del panel viaje a otros sitios al salir                                                                                                              |
| `Permissions-Policy`                         | Cámara, micrófono y ubicación: la aplicación no los usa                                                                                                          |

- **Sin `'unsafe-inline'` en scripts:** el tema se aplica desde
  `public/tema.js`, zod valida sin `eval` y el único script en línea, el
  antifraude de Mercado Pago, lleva un nonce distinto en cada respuesta.
- **Con `'unsafe-inline'` en estilos:** el formulario de pago y los diálogos
  insertan los suyos.
- **La lista de Mercado Pago** no está en su documentación: sale de lo que su
  SDK carga al pintar tarjeta, PagoEfectivo y Yape. `blob:` es para ver el
  comprobante en PDF.
- **Si algo deja de cargar,** la consola del navegador dice qué bloqueó
  (`Refused to …`).
