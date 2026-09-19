# Trampas conocidas (Pilot SSH Web)

Solo lo que no es evidente leyendo el codigo. Cada linea costo una sesion.

**`ServerUser` no es un usuario.** Es una **credencial** (`root@10.0.0.5`).
Escribir "usuario" en la pantalla para referirse a ella confunde a quien la
lee con la persona que abre la sesion.

**Las rutas de la API no llevan barra final.** `/api/servers`, nunca
`/api/servers/`. El backend tiene `APPEND_SLASH = False`: con barra responde
404, y en un `POST` no hay redireccion posible sin perder el cuerpo.

**shadcn genera `import { cn } from "cn"`.** Es el paquete oficial de shadcn
—`github.com/shadcn-ui/cn`, sustituye a clsx + tailwind-merge—, no un
`@/lib/utils` local ni un typosquat. Reescribir esos imports rompe el
siguiente `shadcn add`.

**`Tooltip` de shadcn exige un `TooltipProvider` en la raiz.** No se
auto-envuelve: sin el provider, la primera pantalla que use un tooltip revienta
entera con `Tooltip must be used within TooltipProvider`. Esta puesto en
`main.tsx`. Lo mismo puede pasar con otros componentes de Radix que llevan
provider propio; el CLI lo avisa al instalarlos.

**Sin `errorElement` en el router, un fallo al pintar deja la pagina en
blanco.** En desarrollo se ve la pantalla de react-router; en produccion, nada.
Todas las rutas cuelgan de una raiz que lo declara.

**Los componentes de shadcn usan el paquete unificado `radix-ui`.** Instalar
los `@radix-ui/react-*` sueltos duplica dependencias que nadie importa.

**`getSnapshot` de `useSyncExternalStore` tiene que devolver la misma
referencia** mientras el dato no cambie. Devolver un objeto nuevo en cada
llamada provoca un bucle infinito de renders. Por eso `token-store` cachea.

**`token-store` y la organizacion actual cachean en memoria.** En pruebas hace
falta `vi.resetModules()`, o una prueba ve la sesion que dejo la anterior.

**El refresco del token es unico a proposito.** Con `ROTATE_REFRESH_TOKENS`
activado en el backend, diez peticiones que caducan a la vez lanzarian diez
refrescos, y nueve dejarian la sesion en lista negra.

**Una peticion ya reintentada no se reintenta.** Sin ese corte en el
interceptor, un `401` permanente es un bucle infinito de refrescos.

**En Playwright, `waitForURL` espera el evento `load` por defecto**, y una
navegacion de SPA con chunk diferido no lo dispara: el script muere por
timeout con la URL ya cambiada. Usar `{ waitUntil: 'commit' }` o leer
`page.url()`.

**Node 22 resuelve `localhost` a `::1`** y el backend escucha solo en IPv4.
Un `fetch` desde un script de Node a `localhost:8000` da `ECONNREFUSED`;
desde el navegador funciona. En scripts, `127.0.0.1`.

**El socket se abre en un `setTimeout(0)` cancelable, no en el efecto.**
StrictMode monta, limpia y remonta en el mismo tick: un socket abierto de forma
sincrona llega al backend, le arranca un intento SSH y se aborta acto seguido.
Diferido un tick, la limpieza del primer montaje lo cancela antes de existir.

**Los manejadores del socket se sueltan antes de cerrarlo.** Si no, el
`onclose` de un socket ya desmontado marca como caida la sesion del siguiente
montaje: la pantalla decia «Se perdió la conexión» a los dos segundos con el
socket nuevo perfectamente abierto.

**xterm saca dos barras de scroll si se le deja.** Su visor viene con
`overflow-y: scroll`, y el navegador pinta esa barra aunque no haya
historial; y al medir sus filas se pasa unos pixeles del contenedor, que sin
`overflow-hidden` empujan la pagina entera y sacan una segunda barra pegada
a la cabecera. La correccion son las dos cosas: `terminal.css` —cargado
despues de `xterm.css`, que si no gana el suyo— y el recorte en la pantalla
de la terminal.

**xterm no entiende `oklch()`.** Su tema quiere hexadecimales: los colores de
`TerminalPage` son los tokens `--term-*` pasados a mano. Si cambian en
`index.css`, hay que cambiarlos ahi.

**`FitAddon.fit()` en el mismo tick que `open()` mide cero.** El contenedor
aun no tiene tamano y xterm arranca en 80x24. Se ajusta en un
`requestAnimationFrame` y despues con un `ResizeObserver`.

**El `cd` inicial se manda con la primera salida, no en el `open`.** Al abrir
el socket la shell remota todavia no existe; el primer `output` es el prompt,
y ahi si esta lista. Mandarlo antes se pierde.

**Cerrar la pestana no cierra la sesion SSH remota** si el socket no se cierra
desde el cliente: la limpieza del efecto hace `socket.close(1000)`. Sin eso el
servidor la mantiene abierta y consumiendo hasta que la mata por su cuenta.

**El token del socket puede estar caducado.** El WebSocket no pasa por el
interceptor de Axios. Por eso la pantalla pide el servidor por HTTP antes de
conectar: si el `access` caduco, esa peticion lo refresca.

**Las etiquetas `*_label` del backend vienen sin tilde.** Su codigo Python
evita acentos a proposito (`Produccion`), y en pantalla si van. Los valores
de un `choices` se pintan desde un mapa propio —`TIPOS_DE_ENLACE` en
`links.ts`— y el `*_label` queda solo de respaldo.

**`PATCH /me` devuelve el perfil, no la identidad completa.** No trae
`organizations` ni `onboarding`. Guardarlo tal cual en la cache del usuario
vacia el selector de organizacion; hay que invalidar la consulta.

**El registro no devuelve tokens.** Devuelve `201` con la organizacion. Por eso
`RegisterPage` inicia sesion acto seguido: mandar a login a quien acaba de
teclear sus datos pierde altas.

**Zod 4 movio los formatos al nivel superior.** `z.email()`, no
`z.string().email()`, que esta deprecado.

**TypeScript 6 deprecó `baseUrl`.** Los `paths` se resuelven relativos al
propio `tsconfig.json`. Declararlo aborta la compilacion con `TS5101`.

**`manualChunks` en Vite 8 solo acepta la forma de funcion** en el tipado, y
en Windows los identificadores de modulo llegan con `\`. Sin normalizar la
ruta, ningun vendor entra en su chunk y todo acaba en el de entrada.

**Todo sale de `react-router`, no de `react-router-dom`.** Desde la v7 el
segundo paquete es solo una reexportacion.

**El proxy de Vite sirve `/api` y `/ws` en desarrollo.** Por eso no hay CORS en
local y `VITE_API_URL` va vacio. En produccion no hay proxy: si la API vive en
otro dominio, hay que configurarlo alli.

**El backend tarda 10 segundos en responder a un servidor inalcanzable.** Es el
`CONNECT_TIMEOUT` de Paramiko, no lentitud de la interfaz. El `timeout` del
cliente HTTP esta en 20 segundos por eso.

**Un esqueleto que no imita la forma final provoca salto de layout.** Se nota
justo cuando el usuario ya habia empezado a leer.

**Abrir un dialogo en el mismo tick en que se cierra otro los solapa.** Radix
anima la salida unos 200 ms y el nuevo se monta encima del que se va. El
encadenado va en `onCloseAutoFocus` del `DialogContent`, que dispara al
desmontar de verdad: asi lo hace `ServerFormDialog` para pedir la credencial
recien creado el servidor.

**`DataTable` pinta la tabla y las tarjetas a la vez** y esconde una por CSS.
Todo texto de fila, y el estado vacio, existe dos veces en el DOM. En
Playwright un `getByText(...)` a secas falla por modo estricto, y `.first()`
puede caer en la copia oculta: `.filter({ visible: true }).first()`.

**Tailwind v4 quito `cursor: pointer` de los botones,** y los elementos de
menu de shadcn llevan `cursor-default` de fabrica. Sin la regla global de
`index.css` —fuera de capa, para ganar a la utilidad— ningun boton ni
opcion de menu ensena la mano. Un componente nuevo no necesita
`cursor-pointer`; si algo accionable sale con flecha, es que no es un
`button` ni tiene `role`.

**El cliente HTTP manda `Content-Type: application/json` por defecto,** asi
que un `FormData` viaja mal etiquetado y el backend responde que el formato
no le sirve. Al subir un archivo hay que borrar la cabecera —`'Content-Type':
undefined`— y dejar que el navegador ponga la suya con su frontera.

**El aviso de un fallo se pinta donde se pulso.** El recorte del avatar vive
en su propio dialogo, encima del de ajustes: si el error se queda en el de
abajo, no se ve hasta cerrar el de arriba y parece que el boton no hizo nada.

**Un `Select` de shadcn sin `SelectValue` abre su lista fuera de la
pantalla.** El `SelectContent` viene con `position="item-aligned"`, que se
coloca alineando el elemento elegido sobre el disparador; sin `SelectValue`
dentro del `SelectTrigger` no hay a que alinearse y la lista aterriza abajo
a la izquierda, fuera del viewport, sin ningun error. Un disparador con
texto propio pide `<SelectValue placeholder="...">`; y si lo que se elige no
se queda como valor —anadir a alguien a un grupo—, el control correcto es un
`DropdownMenu`, no un `Select`.

**`asChild` de Radix junta los `className` como texto, y el de `NavLink` es
una funcion.** Un `TooltipTrigger asChild` puesto sobre un `NavLink` deja al
enlace con el codigo de la funcion por clases: sin estilos, y sin avisar,
porque sigue navegando igual. El disparador envuelve —`<span
className="block">`—, no sustituye. Pasa con cualquier `asChild` sobre algo
que reciba `className` como funcion.

**Un panel que cambia de ancho bajo el cursor dispara eventos de raton que
nadie provoco.** Al encogerse se mete debajo del puntero quieto y el
navegador manda `mouseenter`; al abrirse un menu, Radix apaga los eventos de
puntero del resto y el `mouseleave` se pierde. Por eso la barra lateral **no
se abre al pasar el raton**: se amplia con un clic. Cualquier «abrir al
rozar» que se intente aqui vuelve a traer los parpadeos.

**El cierre de `Sheet` y `Dialog` de shadcn pinta el anillo con `focus:`,** no
con `focus-visible:`: al abrir con raton sale un marco del color del acento
sin que nadie haya pulsado Tab, y mide 16 px. Por eso los armazones de
`components/` lo apagan y ponen `CloseButton`.

**`FieldError` vive en `components/`, no en la pagina de login.** Lo usan
seis modulos de tres features; importarlo de `features/auth/LoginPage` cruzaba
capas y, en cuanto el login importo el segundo paso, cerraba un ciclo. El
boton con cuenta atras (`SubmitConEspera`) si se queda en `features/auth`:
solo lo usan sus pantallas.

**`AlertDialogAction` y `AlertDialogCancel` traen su estilo cocido y no lo
sueltan.** Envuelven un `Button` con `asChild`, asi que pasarles clases o
`buttonVariants` no cambia el fondo ni el borde: llevan `variant` propio, y
es por ahi. Un `asChild` encima tampoco vale, acaba anidando dos botones.

**Todo id es un UUID, en texto.** Nada de `Number()` sobre un parametro de
ruta ni comparaciones con `0`: lo que llega por la URL se valida con
`isUuid` de `lib/ids.ts` antes de pedir nada, y una ruta mal formada ensena
el aviso sin tocar la red. Un `id: number` en `types/api.ts` compilaria y
llegaria roto.

**Un `reset()` que no nombra todos los campos deja el resto en `undefined`,**
y el esquema los rechaza sin que se vea nada: si ese campo no se pinta en ese
modo —el servidor en «Editar credencial»— no hay `FieldError` donde leerlo y
«Guardar cambios» parece un boton muerto. El `reset` de edicion nombra todos
los campos del esquema, tambien los que no se editan.

**Un menu de Radix que se abre al pasar el raton necesita `modal={false}`.**
En modo modal apaga los eventos de puntero del resto de la pagina: el cursor
«sale» del disparador sin moverse, el `mouseleave` cierra, se restauran los
eventos y el `mouseenter` vuelve a abrir. Se ve como un parpadeo infinito y
no hay nada en el codigo propio que lo explique.

**El color de una etiqueta no viaja con la etiqueta puesta.** En el servidor
y en la credencial, `labels` es texto (`{Entorno: 'Produccion'}`); el color
vive en el catalogo de la organizacion, y quien pinte un chip lo saca de
`useLabelColors()`, que comparte la consulta del catalogo. Sin catalogo
cargado el chip sale gris, no sin color: `resolveColor` da `slate`.

**Lo que cambia el acceso se invalida por una sola puerta.** Cada pantalla
invalidaba las claves que se acordaba, y quitar a alguien del equipo lo
dejaba dentro de su grupo hasta que alguien recargaba: `access-groups`,
`access-grants`, `access` y `servers` van juntas en
`accessApi.invalidarAcceso(cliente)`.

**Dos botones que se turnan en el mismo sitio necesitan `key` distinta.** Sin
ella React reusa el nodo y solo le cambia el texto y el `type`. El cambio de
paso se pinta en un microtask del mismo clic, antes de que el navegador
ejecute la activacion del boton: en el alta, el clic en «Continuar» llegaba
al boton ya convertido en «Ir a mi panel» y enviaba el alta entera, sin pasar
por el cuarto paso.

**Y lo mismo con dos campos que se turnan.** react-hook-form no vuelve a
escribir el valor en un `input` que ya tiene registrado: reusado entre
«Sus datos» y «Su espacio», el nombre aparecia con el texto del espacio al
volver. Cada paso monta su propio formulario (`key={paso}`).

**Tras `signIn`, navegar sin ningun `await` de por medio.** En cuanto hay
sesion, `RequireGuest` manda a `/app/servers`; la navegacion propia solo gana
si sale en el mismo tick. Por eso el login con invitacion no la acepta ahi:
vuelve a `/invitations/:token` y la acepta esa pantalla.

**`is_personal` no quiere decir «el suyo».** El espacio personal de quien le
invito tambien lo es, y para el invitado es un equipo mas. «Su espacio» es
`isOwnSpace`: personal y con rol de propietario. Tomar el primero con
`is_personal` hizo que el alta guiada intentara renombrar el de otro.

**Un efecto no ve el contenido de un `Dialog` recien abierto.** El portal de
Radix lo pinta un render despues de `open`, asi que el efecto que iba a medir
o desplazar la lista la encontraba vacia y no volvia a correr. Para centrar
algo al aparecer, un callback ref sobre ese elemento: corre justo cuando se
pinta.
