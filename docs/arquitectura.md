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

## La terminal

`src/features/terminal` separa la pantalla del enlace: `TerminalPage` monta
xterm una sola vez y `useTerminalSocket` lleva el WebSocket.

- **Un corte no borra nada.** El hook reintenta con espera creciente hasta
  dos minutos, y antes del reloj si vuelve la red o la pestaña. Como xterm no
  se desmonta, lo escrito sigue en pantalla; la API devuelve la misma sesión
  y reenvía lo que salió mientras tanto.
- **Varias shells en pestañas.** Hasta seis por ventana, con cualquier
  credencial del servidor; `Alt+1`…`Alt+9` cambia de una a otra. Las de atrás
  siguen conectadas y recibiendo. Abrir más no cuesta más: el cobro cuenta
  servidores y personas por día.
- **Buscar en lo que ya pasó.** `Ctrl+Shift+F` abre la búsqueda sobre el
  historial de esa shell, con las coincidencias resaltadas.
- **La cabecera dice cuánto tarda la red.** Junto a «Conectado», la ida y
  vuelta de la última tecla, en tramos de 10 ms.
- **Arrastrar un archivo lo sube donde está parado.** El destino sale del
  `cd` de la shell, leído de lo que anuncia (OSC 7) o de su prompt; si no se
  sabe, la carpeta de trabajo de la credencial. Viaja en tramos por el mismo
  socket, por turnos para que teclear no espere detrás del archivo, con el
  destino y el avance a la vista y con cancelar a mano; lo escrito a medias
  lo borra el servidor.
- **Al terminar, el aviso queda con la ruta**, y con copiarla o ir a la
  carpeta: escribirlo en la shell dejaba el prompt a medias. Para otra
  carpeta, el menú de la barra abre un selector que se navega a clics.
- **Cuando la shell termina, el texto sigue ahí.** En vez de taparlo con un
  cartel, una barra sobre la terminal ofrece volver a conectar, cerrar esa
  pestaña o salir; lo escrito se puede leer y copiar.
- **En el móvil cabe todo.** Las pestañas se desplazan pero los botones de
  la ventana se quedan fijos, y la barra de sesión cerrada apila sus acciones
  en vez de salirse.
- **Atajos de terminal de siempre.** `Ctrl+Shift+C` y `Ctrl+Shift+V` copian y
  pegan sin robarle `Ctrl+C` a la shell; el botón de ayuda los lista.
- **La letra no espera a la red.** Con más de 90 ms de ida y vuelta,
  `eco-predictivo` pinta la letra al instante, igual que la pintará el
  servidor, y cuando el eco confirma lo mismo no la repinta: marcarla de
  otro color o borrarla y reescribirla delataba la espera que se quiere
  disimular. En vim o htop no adivina, y si la shell deja de repetir lo
  tecleado —pide una contraseña— borra lo adelantado y deja de adivinar.

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
