# Arquitectura (Pilot SSH Web)

**UNA SOLA APLICACION.** Landing publica, autenticacion y panel privado viven
en el mismo proyecto y el mismo dominio. No hay dos aplicaciones ni dos
despliegues: lo que separa lo publico de lo privado es el arbol de rutas.

```
/  /pricing /security /terms /privacy   publico, compilado a HTML
/login  /register    autenticacion           solo invitados
/onboarding          segundo paso del alta   autenticado
/app/*               panel                   autenticado
/app/servers/:id     pagina del servidor      autenticado
  /credentials /links /sessions      sus pestanas, con URL propia
/app/credentials/:id pagina de la credencial  autenticado
  /stats                             sus estadisticas; el historial es la de partida
/app/organization    la organizacion actual   autenticado
/app/team            el equipo y su acceso    autenticado
  /groups /labels    sus pestanas, con URL propia
/app/credits         saldo y resumen          autenticado
  /transactions /usage /topups  libro mayor, uso por periodo y recargas, con filtros y paginados
/backoffice          la plataforma entera     personal de Pilot SSH, con dos pasos
  /organizations/:slug  el caso de un cliente: /team /access /money /notes
  /accounts /staff /activity  cuentas, personal y su actividad
  /topups /transactions /pricing /history  recargas, libro mayor y precios de todas
/invitations/:token  aceptar una invitacion   publico
```

**EL COSTE DE JUNTARLO SE PAGA CON CARGA DIFERIDA.** Sin ella, quien abre la
landing descargaria las tablas, los formularios y la terminal para leer un
titular. Todo lo de `/app` y de autenticacion entra por `lazy` en el router.

**REPARTO POR CARPETA:**

| Carpeta | Responsabilidad | No le toca |
|---|---|---|
| `features/<dominio>/` | Pantallas, llamadas y estado de un dominio | Nada de otro dominio |
| `layouts/` | Los tres armazones: publico, invitado, panel | No pide datos de dominio |
| `routes/` | Arbol de rutas y guards | No pinta contenido |
| `components/ui/` | shadcn generado | No se escribe a mano |
| `components/` | Composicion propia sobre `ui/` | No conoce features |
| `lib/` | Cliente HTTP, errores, formato, utilidades | No conoce features |
| `types/` | Contrato con la API | No tiene logica |
| `pages/` | Pantallas sueltas sin dominio (404, error) | No crece con el producto |

**DIRECCION DE LAS DEPENDENCIAS.** `features` importa de `lib`, `components` y
`types`; nunca al reves. Un import de `lib` hacia `features` delata la pieza
mal puesta.

- Excepcion declarada: `lib/http.ts` importa `features/auth/token-store`. El
  interceptor necesita el token y el store esta escrito sin React justo para
  eso. Va comentado.

**CAPAS DENTRO DE UNA FEATURE:**

| Archivo | Responsabilidad | Equivalente en el backend |
|---|---|---|
| `api.ts` | Llamadas tipadas y claves de consulta | `urls.py` + `serializers.py` |
| `<Pantalla>Page.tsx` | Estados, composicion, orquestacion | `views.py` |
| `<Cosa>Dialog.tsx` / `<Cosa>Form.tsx` | Un formulario, una responsabilidad | — |
| `<algo>.ts` | Decision pura, probable sin montar nada | `services.py` |
| `*.test.ts` | Junto a lo que prueba | `tests/` |

Una pantalla que hace tres mutaciones y decide reglas esta haciendo de
servicio: la decision se extrae a una funcion pura del mismo directorio.

**PUNTOS UNICOS DE ESCRITURA.** Una sola puerta por concepto:

| Concepto | Unica puerta |
|---|---|
| Peticion a la API | `lib/http.ts` |
| Normalizar un fallo | `lib/api-error.ts` → `toApiError` |
| Errores del backend en un formulario | `lib/form.ts` → `applyFieldErrors` |
| Sesion y tokens | `features/auth/token-store.ts` |
| Abrir sesion con unos tokens | `signIn` / `completeTwoFactor` de la sesion |
| Organizacion actual | `features/organizations/current.ts` |
| Fechas y cantidades | `lib/format.ts` |
| Tema claro/oscuro | `components/theme-provider.tsx` |

**EL TEMA ARRANCA EN OSCURO.** Quien no ha elegido ve oscuro, no lo que diga
el sistema; despues manda su eleccion, que incluye «Sistema». Lo aplica un
guion de tres lineas en `index.html` **antes del primer pintado**: puesto
solo en el efecto de React, la pagina nace clara y salta a oscuro en cada
recarga.

**TODO LISTADO SE MONTA IGUAL.** Cinco piezas en este orden, dentro de un
`space-y-4`:

```
PageHeader     titulo, descripcion y la accion primaria
FilterBar      busqueda + panel avanzado + alternador de vista
DataTable      tabla en sm+, tarjetas en movil, con sus cuatro estados
Pagination     debajo y fuera de la tarjeta; desaparece con una sola pagina
```

**Cada listado arranca con la vista que le conviene y recuerda la suya.**
Servidores en tarjetas —son pocos y cada uno se mira entero—; Credenciales en
tabla —son muchas y se comparan—. La eleccion se guarda por modulo
(`pilotssh.vista.<modulo>`): elegir en uno no decide por el otro.

**Servidores y Credenciales arrancan por el ultimo uso.** Se vuelve a la
maquina de ayer mas que a la recien dada de alta. Lo que nunca se uso va al
final, desempatado en el servidor (`StableOrderingFilter`): sin eso, la pagina
siguiente repetia una fila y se saltaba otra.

**En Credenciales, con etiquetas puestas se filtra por etiqueta y no por
forma de entrar**: el entorno es lo que se busca, y quien busca la de pruebas
no piensa en si entra con llave. Sin ninguna, queda la forma de entrar. Son
las de las credenciales (`/server-users/labels`), no las de sus maquinas: una
opcion que no sale en la columna «Etiquetas» no se entiende.

Lo gobierna `lib/use-listado.ts`: filtros, pagina, vista y freno de 350 ms
**solo en la busqueda** —un selector ya es una decision terminada—. Cambiar
un filtro vuelve a la pagina 1, y las claves en blanco no viajan.

**Se filtra en el servidor, no en el cliente.** La lista viene paginada:
buscar en el navegador solo miraria la pagina a la vista y diria que no hay
resultados que si existen.

**La tarjeta se deriva de las mismas columnas** que la tabla, por su `rol`
(`titulo`, `acciones`). Definir el listado dos veces garantiza que se
desincronicen.

**La insignia acompana al nombre en linea.** «Verificado» o el escudo van
detras del nombre como texto, no como hermano flex con `items-center`: si
el nombre salta de linea, la insignia sigue a la ultima palabra en vez de
flotar entre las dos. Un chip vive dentro de su celda: `max-w-full` y
`truncate`, con el texto completo en `title`; en media tarjeta un usuario
largo se corta con puntos, no se sale de la tarjeta. Y en una fila
estrecha, lo secundario lo lleva el icono que ya la encabeza —con su
tooltip y su texto para lector de pantalla—: «Contraseña» escrito se
comia el usuario, que es lo que se viene a leer. Ese glifo significa lo
mismo en todas partes y sale de `FORMAS_DE_ENTRAR`: llave es llave,
candado es contrasena. La llave de la barra lateral o de «Anadir
credencial» nombra la categoria, no una credencial concreta.

**CADA PANTALLA OFRECE EL SIGUIENTE PASO.** Una fila sin credencial lo dice
y deja anadirla ahi mismo; el menu de tres puntos empieza por lo que toca
hacer, no por «editar»; recien creado un servidor, la app abre sola el alta
de su credencial. Quien tiene que descubrir el siguiente paso por su cuenta
abandona antes de darlo.

**RECIEN CREADA UNA ORGANIZACION, SE ENTRA EN ELLA Y SE VA A SERVIDORES.**
Quien la crea viene a trabajar, y lo primero que necesita es una maquina
registrada. Quedarse en la pantalla de antes deja mirando una lista vacia sin
saber que ha cambiado el contexto; el vacio de Servidores, en cambio, explica
los tres pasos.

**EL ACCESO SE MIRA DESDE LOS DOS LADOS, Y SON EL MISMO DATO.** Desde una
maquina, la pestana **Accesos** de su pagina: quien entra, con que nivel y
por que —por su grupo, por una etiqueta o porque se lo dieron ahi mismo—,
incluido lo concedido sobre una sola de sus credenciales. Desde el equipo,
«Grupos de acceso» en `/app/team` ensena que alcanza cada grupo y quien esta
dentro.

**La pestana lee y corrige; «Compartir» es lo unico que da acceso nuevo.**
Los dos montan `ServerAccess`, pero el formulario solo sale en el panel: el
mismo formulario en dos sitios deja preguntandose en que se diferencian, y
el boton de «Compartir» esta en la cabecera de la propia pagina.

Antes solo existia el panel, y para responder «quien entra a esto» —media
pregunta del producto— habia que abrirlo.

Drive solo tiene la primera vista y por eso nadie sabe que tiene compartido;
GitHub solo la segunda y por eso compartir algo suelto es incomodo.

**LAS PERSONAS ENTRAN POR EQUIPO; COMPARTIR SOLO REPARTE ENTRE LOS QUE YA
ESTAN.** Habia dos puertas para meter gente —invitar en Equipo, y teclear un
correo en «Compartir»— y la segunda creaba personas fantasma: salian en la
maquina y en ningun otro sitio, y quien las veia alli las buscaba en Equipo
sin encontrarlas.

Peor: **ese acceso no servia para nada.** El selector de organizacion sale de
las membresias (`fetch_organizations_for` filtra por `memberships__user`), asi
que sin estar en el equipo esa persona no puede elegir la organizacion y no
llega a ver la maquina que le compartieron. Habia cinco asi en la base.

Ahora lo impide el backend (`fetch_teammate`) y la pantalla no lo ofrece.

**Un solo campo: «A quien».** Se acabo el alternador «Un grupo / Una persona»,
que obligaba a decidir antes de buscar. Es un selector con buscador
(`features/access/SubjectPicker.tsx`) con los grupos, las personas y las
invitaciones sin aceptar en tres secciones y, al final, «Invitar a alguien al
equipo», que es la unica forma de que salga alguien nuevo.

**A quien no ha aceptado todavia se le da acceso igual.** Esperar a que
acepte para repartir era un cuello de botella —invitar, acordarse, volver—, y
en las herramientas que el usuario ya conoce se comparte con quien sea desde
el primer momento. La concesion se guarda a nombre de la invitacion, **no da
acceso hasta que entre**, y su fila lo dice con el sobre y «Lo tendra al
aceptar la invitacion». Al aceptar pasa a su nombre; cancelada, se retira.

**El buscador de un menu es una pieza del kit** (`components/search-menu.tsx`):
lo usan «A quien» y el «Anadir a alguien del equipo» de un grupo, que se queda
abierto porque casi siempre se anade a varios.

**Compartir una maquina habla solo de esa maquina.** Un grupo que ya entra a
toda la organizacion no sale en «A quien»: compartirle el servidor no suma
nada, y su nombre al lado de «Sobre: todo el servidor» se leia como una
contradiccion. Su fila sigue en la
lista de abajo, que es donde se ve que ya entra.

**Al elegir a alguien, el panel dice lo que ya puede hacer ahi**
(`access/subject.ts`, probado): «Ya puede conectar aqui», o «... por el grupo
"Backend"». Una linea y solo al elegir: el aviso fijo que salia antes de
elegir nada se leia como un error y se quito.

**El boton dice lo que va a pasar, y si no pasaria nada no se ofrece**
(`decidirAccion`, probado). Al mismo sujeto y sobre lo mismo el backend cambia
la fila que hay: el boton pasa a «Cambiar a Gestionar», «Cambiar la
caducidad» o «Quitar la caducidad», y con todo igual se apaga. Activo, se
pulsaba sin que cambiara nada y parecia que fallaba.

**Sobre una sola credencial, el nivel habla de ella** (`describirNivel`): «Abre
terminales con uat-sunmetals», y «Gestionar» avisa de que editar pide el
servidor entero, que es lo que hace el backend. Y en la lista de una maquina
la credencial se nombra sin la maquina —«Solo uat-sunmetals»—, porque ya es
donde se esta.

**Y lo que sobra se reduce: tres decisiones, no seis.** A quien, sobre que
—solo si la maquina tiene credenciales— y con que nivel. La caducidad vive
detras de «Poner caducidad» (`access/ExpiryField.tsx`), porque lo normal es
que un acceso no caduque.

**QUIEN SALE DEL EQUIPO SE VA CON SUS ACCESOS.** Es el mismo invariante por el
otro lado, y el backend ya lo hacia: al borrarse la membresia se retiran sus
concesiones. Colgadas no servian —no veria la organizacion— y volver a
invitarla le devolveria en silencio lo de antes. La confirmacion lo dice.

**Y lo que quedo suelto se ve y se arregla en Equipo**
(`access/OutsiderGrants.tsx`): «Con acceso, pero fuera del equipo» lista a
quien tiene concesiones sin membresia, con «Invitar al equipo» —el correo ya
escrito— y «Quitar el acceso». Sin ese bloque, un nombre visto en un servidor
no se encontraba en ninguna parte.

**LA CREDENCIAL TAMBIEN SE COMPARTE, Y DESDE ELLA.** El modelo concede sobre
una credencial suelta, pero solo se llegaba desde «Compartir» del servidor
eligiendola en «Sobre», tres pasos lejos de donde se piensa; y desde
la credencial no habia forma de saber quien entra con ella. Ahora «Compartir»
esta en su menu —en la maquina y en la lista transversal— y en su pagina, y
abre `CredentialAccessSheet`, que **pide la maquina el mismo** con la clave de
su pagina: en la lista de credenciales no esta a mano.

Es `ServerAccess` con `credencial`: sale lo que le llega —lo de la
organizacion, la etiqueta y el servidor— mas lo suyo, y lo que se de va a
ella. Una pantalla aparte habria sido la misma regla escrita dos veces.

**El grupo tambien alcanza una credencial suelta.** El dialogo del grupo
ofrecia organizacion, etiqueta y servidor; el servidor ofrecia ademas la
credencial. Era la misma frase con dos vocabularios.

**Un grupo se describe por lo que alcanza, no por quien esta dentro.** Al
invitar, «Todo el equipo» decia «Todos los miembros de la organizacion» y
marcarlo daba entrada a todo sin que nada lo avisara. Ahora cada grupo dice a
que da entrada —«Toda la organizacion · Conectar», «Web PRD · API PRD y 1
mas», «Todavia no da acceso a nada»— con `describirLoQueAlcanza`
(`access/subject.ts`, probado), igual al invitar que en «A quien».

**Ningun grupo nace con la organizacion.** Hubo uno especial que daba toda
la organizacion, y ningun nombre le cuadraba: «Todo el equipo» sonaba a que
estaban todos, y «Acceso completo» sonaba a alcance al lado de «Sobre: este
servidor». Era un alcance disfrazado de grupo. Ahora **«Toda la organizacion»
se da como lo que es**: una opcion al invitar y un selector en «Ver sus
accesos». Los grupos los crea el equipo, con el nombre de su funcion.

**Lo heredado no se quita desde la maquina.** Una concesion a la organizacion
o a una etiqueta sale sin boton de quitar: se cambia en su grupo, porque
quitarla ahi se la quitaria tambien a las demas maquinas.

**Quien administra la organizacion sale siempre, y aparte.** Entra sin que
nadie le conceda nada; sin esa lista, la pantalla diria que la maquina no la
ve nadie.

**En el inventario, cada servidor ensena las suyas.** Es una columna mas de
la lista —«Ninguna» cuando no lleva— y en la tarjeta va junto a los enlaces:
sin ellas a la vista, la unica forma de saber por que alguien entra a esa
maquina era abrirla.

**Donde la fila es estrecha caben dos, y el resto se cuenta en un «+N»**
(`components/more-menu.tsx`): en la tarjeta del inventario y en cada fila de
credencial. Con tope, las etiquetas ocupan **una sola linea**: no se doblan,
se encogen si la linea se llena y lo que sobra va al «+N». Tres lineas de
chips escondian la credencial de al lado.

**La tarjeta de una credencial repite la del servidor**: seis campos en dos
columnas —servidor, como entra, etiquetas, enlaces, ultimo uso y sesiones—, y
las etiquetas en su campo, no bajo el usuario: ahi estiraban la tarjeta y la
descuadraban de la de al lado. La carpeta de trabajo va bajo el servidor, que
es donde cae la terminal.

**En la fila de una credencial, los enlaces se despliegan.** Van plegados
tras un galon junto a su terminal —la fila se recorre buscando la
credencial, y sus enlaces son el paso siguiente— y al abrirlos va uno por
linea, a lo ancho y con el glifo de salida a la derecha: en chips, cinco
enlaces enterraban la credencial de abajo, y recortados no se leia cual
era cual. Con cuatro de
cada una, el panel de credenciales era un muro de chips y cada credencial
ocupaba ocho lineas. El «+N» de las credenciales de un servidor, en cambio,
abre su panel: de cada una se quiere su terminal y su menu, no solo su
nombre.

Se abre con un clic, no al pasar el cursor: recorriendo la lista se abria
solo al cruzarlo. Y es un menu, no un tooltip —en el movil no hay cursor que
pasar, y el aviso invertido con chips de color dentro se leia como un
parche—, que sale a un lado, porque encima tapaba lo que ya se lee.

**Las tres formas del «+N» son la misma pieza** (`components/more-badge.tsx`):
dos disenos distintos para «lo que no cabe» se leen como dos cosas distintas.

**Y cada credencial las suyas, en su fila** (`FilaCredencial`, que usan el
panel lateral, el resumen del servidor y su pestana). El entorno vive ahi y no
en la maquina: con dos credenciales en el mismo VPS, sin etiqueta no se sabe
cual es la de pruebas hasta abrir la terminal.

**Se ponen desde un menu, no con un selector por etiqueta.** El formulario
ensena las puestas como chips con su aspa y un boton de anadir; el menu lista
los nombres del catalogo y cada uno abre sus opciones. Con un selector por
nombre, una organizacion con cincuenta etiquetas llenaba la pantalla de listas
vacias para elegir tres.

**Al dar de alta se eligen dentro del formulario; despues se cambian en su
propio dialogo**, desde «Etiquetas» en el menu de la fila. En «Editar
credencial» convivian con el usuario, la contrasena y las notas: cambiar el
entorno obligaba a repasar un formulario entero para no tocar lo que no se
venia a tocar. Es la misma regla que los enlaces, que tienen su panel.

**Las etiquetas se editan con el servidor y con la credencial, y se ven en
su cabecera.** Son la razon por la que alguien entra o no entra: escondidas,
un acceso concedido por etiqueta no se explica solo. En el inventario son un
filtro mas, y las opciones salen de las que hay puestas (`/servers/labels`):
tecleadas de memoria, un dedazo devuelve cero resultados sin decir por que.

**El entorno va en la credencial, no en la maquina.** Un VPS aloja el sitio
de UAT y el de produccion; etiquetar la maquina entera obliga a mentir en
uno de los dos.

**El catalogo vive en Equipo, y cada opcion dice cuanto lleva puesto.** Lo
que lleva puesto lleva al inventario ya filtrado —saber que hay tres es media
respuesta, la otra mitad es cuales— y la papelera esta apagada mientras
sostenga algo: borrarla en uso quitaria de golpe el acceso de quien entraba
por ella.

**Cada opcion lleva su color, y se ve donde este puesta.** El catalogo lo
ensena como un punto junto al nombre, y el chip del servidor y el de la
credencial van **rellenos** de el (`components/color-chip.tsx`): tenido al
15 % no se distinguia el rojo del ambar a un metro de la pantalla. Nunca va
solo —el chip sigue diciendo «Entorno: Produccion»—, sale de la paleta
compartida con los avatares (`lib/palette.ts`) y se cambia con un clic al
editar la opcion. El teal se reparte el ultimo: es el de la accion primaria
de cada pantalla.

**El texto de encima lo elige la paleta, no el chip.** El blanco sobre
ambar no llega al contraste minimo, asi que ese lleva el suyo casi negro;
cada color trae su pareja ya resuelta y quien pinta un chip no decide.

**El alta de una etiqueta pregunta el nombre y nada mas.** Las opciones se
anaden despues, una a una, desde el boton de su propia fila: pedir las dos
cosas en el mismo formulario lo convertia en dos pantallas pegadas, con su
lista, su boton de anadir y su papelera dentro de un dialogo.

**Una etiqueta puede existir sin opciones**, y la fila lo dice. Sin ellas no
se puede poner en nada, asi que el formulario del servidor y el de la
credencial no la ofrecen: un selector con una sola entrada —«Sin definir»—
es un control muerto.

**Cada opcion se nombra y se colorea en el mismo dialogo**, y el color ademas
se cambia de un clic desde su punto en la fila: es donde se ve junto a los
demas, que es cuando se decide cambiarlo. Las dos formas escriben por
`updateLabelValue`.

**Cada etiqueta es una fila que se despliega, como los grupos, y cada opcion
se edita sola.** En una hilera de chips no se ve cual lleva algo puesto ni
donde pulsar para corregir una, y cambiar la lista entera obligaba a repasar
lo que no se venia a tocar.

**«Ver sus accesos» vive en el menu de cada miembro.** Ensena a que maquinas
entra y **de donde le viene cada una** —por su grupo, por una etiqueta, por
una concesion suya o por administrar la organizacion—. Una maquina puede
salir con dos motivos, y eso es justo lo que hay que ver antes de quitar
uno y creer que se corto el acceso.

**EL EQUIPO SE GESTIONA DESDE UNA SOLA PANTALLA, CON TRES PESTANAS.**
`/app/team` es **Equipo**: en «Personas», quien esta dentro y —debajo, en
su propio bloque— las invitaciones sin aceptar, que no son miembros todavia;
en «Grupos de acceso», que alcanza cada grupo y quien lo compone; en
«Etiquetas», el catalogo con el que se concede.

Las etiquetas estan aqui y no en la organizacion porque se definen mirando a
quien hay que dejar entrar, que es lo que se hace en las otras dos.

Se llama Equipo y no Miembros porque la pantalla ya no lista solo personas.

**LO QUE SE VE SE CAMBIA AHI MISMO.** La cabeza va de la persona al grupo, y
la pantalla lo permitia solo al reves: para meter a alguien en «Backend»
habia que cambiar de pestana, desplegar el grupo y buscarle por su nombre.
Ahora sus grupos se marcan desde el menu de su fila y desde su panel de
accesos.

**Y lo que se lee se corrige donde se lee.** En «Ver sus accesos» se quita la
concesion dada a su nombre; lo que le viene de un grupo, no —quitarlo se lo
quitaria a los demas—: para eso estan sus grupos, arriba en el mismo panel.
El nivel de un acceso se cambia en su fila, en el grupo igual que en la
maquina: subir de Ver a Conectar era quitarlo y volver a darlo, y por el
camino se perdia la caducidad.

**Lo que se repite no se cierra al usarlo.** El menu de anadir gente a un
grupo lleva buscador y se queda abierto: con veinte personas, bajar la lista
a ojo y reabrirla por cada una era el trabajo entero. Y lo que se quita sin
confirmar —sacar a alguien de un grupo— ofrece «Deshacer» en su aviso.

**Los grupos son una tabla, y su gente se despliega en la fila.** Cinco grupos
se comparan de un vistazo; una ventana por grupo obligaba a entrar y salir de
cada uno para saber quien esta donde.

**Las filas nacen abiertas.** Al entrar, la pregunta es quien esta en cada
grupo: tener que desplegarlos uno a uno es el clic que sobra. Se pliegan si
estorban.

**El icono dice de que alcance se trata; el texto solo lo nombra.** Un chip
que ademas lo explicaba —«Todo lo que lleve Entorno: Produccion»— partia la
fila en dos lineas sin anadir nada, porque la etiqueta ya iba delante. En la
cabecera caben dos accesos y el resto se cuenta («y 3 mas»): la lista entera
vive en su dialogo.

**Lo que alcanza el grupo se resume en su fila y se cambia en su dialogo.**
Quien esta dentro y a que da entrada son dos preguntas distintas: juntas en un
panel no se leia ninguna. La fila las separa —gente al desplegar, accesos en
«Accesos del grupo»— y el menu de la fila guarda lo demas.

**Al invitar se decide a que entra, y se empieza por lo minimo.** Dos
respuestas con el mismo peso: **«Solo lo que elija»** —la de partida, con sus
grupos y los servidores o credenciales sueltas (`access/DirectGrantsField.tsx`)—
y **«Toda la organizacion»**, con su nivel. Cada una ensena lo suyo solo cuando
esta elegida, y lo que se marco en la otra no viaja. Con toda la organizacion
en una ficha grande y lo concreto en un boton pequeño, la pantalla empujaba a
dar todo. Lo elegido se guarda a nombre de la invitacion y lo recibe al
aceptar.

**El dialogo de invitar lleva poco texto.** Lo que explica cada rol y cada
opcion va tras un icono de informacion **al final de su ficha**
(`ChoiceCard` con `ayuda`), no en el titulo de la seccion: ahi obligaba a leer
la explicacion de todas para saber cual era cual. Y lo concreto se añade en su
propio dialogo, «Añadir servidor o credencial»: desplegado dentro, con tres
selectores mas, la invitacion se leia como un formulario largo.

**Quien entra de administrador no elige a que entra**: entra a todo por su
rol, y la seccion lo dice en una linea. Marcar grupos o servidores para
alguien que ya lo ve todo solo hacia dudar, y no se envia.

**En Personas, el rol y el acceso van en columnas distintas, y se dice por
que.** «Solo lectura» en el rol y «Conectar» en su grupo se leian como una
contradiccion: el rol dice que gestiona en la organizacion, y la columna
**Acceso** a que entra —«Todo, por su rol», «Toda la organizacion · Ver», sus
grupos, lo concreto—. Mostrar solo los grupos dejaba «En ninguno» a quien
tenia toda la organizacion a su nombre, como si no entrara a nada.

**Las pestanas de cualquier pantalla se montan con `TabNav`**
(`components/tab-nav.tsx`) y son rutas hijas: se enlazan, se guardan y el
«atras» del navegador vuelve a la de antes. Lo usan el servidor y el equipo,
y dos chapas distintas para lo mismo se leerian como dos aplicaciones.

**El rol se cambia desde la fila, sin dialogo.** Elegir entre cuatro opciones
no merece una parada; quitar a alguien si confirma, y dice que se pierde.

**Lo que el backend va a rechazar no se ofrece.** El rol propio y el del
propietario salen desactivados, no como un boton que falla al pulsarlo. La
comprobacion de verdad sigue estando en el servidor.

**La invitacion se lee sin cuenta.** `/invitations/:token` vive fuera de los
guards: quien la recibe puede no tenerla todavia y necesita saber a que le
invitan antes de crearse una. Aceptarla si exige haber entrado con el correo
invitado.

**Y no se pierde por el camino.** Registrarse o entrar desde ella lleva el
testigo en `?invitacion=` —lo unico que sobrevive al ir y venir entre
pantallas—, y el formulario nace con su correo puesto. El alta la acepta en
la misma peticion; el login vuelve a `/invitations/:token` y ahi se acepta
sola. Antes las dos acababan en el panel, y habia que abrir el correo otra
vez. Con la sesion de otra cuenta, la pantalla ofrece cerrarla.

**Ofrece un solo camino, el que toca.** La invitacion dice si ese correo ya
tiene cuenta: con ella, «Iniciar sesion y unirse»; sin ella, «Crear cuenta y
unirse». Con los dos botones, quien no recordaba si tenia cuenta elegia a
ciegas y tropezaba con «ya existe». Por lo mismo, el enlace cruzado del login
y del alta desaparece cuando no llevaria a aceptarla.

**EL ALTA GUIADA ES DE SU ESPACIO, Y NO CREA NINGUNO MAS.** Cuatro pasos:
la cuenta ya creada, su correo, sus datos y su espacio. Antes, el campo de organizacion
del segundo paso creaba una **segunda** organizacion al lado de la personal, y
quien acababa el alta tenia dos espacios el primer dia sin haber pedido el
segundo. Las demas se crean despues, desde el selector, que es donde ya se
mira cuando se piensa «quiero otro espacio».

**El del correo se puede dejar para despues.** El codigo sale con el alta y
se confirma mientras esta fresco; quien lo salta sigue sin marca en el
progreso —no esta hecho— y el aviso de arriba se lo recuerda en cada pantalla.

**El progreso tambien lleva, pero solo hacia atras.** A un paso ya pasado se
vuelve con un clic, o con «Volver»; a uno que falta no se adelanta, que se
saltaria lo que pide. Ir al espacio desde ahi comprueba el nombre, como
«Continuar», y en «Sus datos» Enter tambien es «Continuar»: enviar desde
ahi dejaba el error en un campo que no se ve. En «Su espacio», en cambio,
Enter no termina: un segundo Enter al llegar se saltaba el paso entero, y
solo termina «Ir a mi panel».

**El espacio personal existe desde el registro, pero sin nombre propio.** Nace
como «Espacio personal» —al registrarse no se sabe todavia como se llama quien
lo hace, y «Espacio de 2019110516» sacaba el usuario del correo— y el alta
guiada pregunta el definitivo, ya propuesto a partir del nombre recien
tecleado y con la mayuscula puesta. Su direccion sale del correo y no se
pregunta.

**Y elige con que etiquetas empieza, igual que al crear una organizacion**
(`organizations/LabelTemplateField.tsx`, con `Entorno` marcada). Dos formas de
elegir lo mismo se leerian como dos cosas distintas, asi que la plantilla, su
aplicacion y sus fichas viven en una sola pieza.

**LA ORGANIZACION NACE CON ETIQUETAS, Y SU DIRECCION NO SE PREGUNTA.** El
alta es de dos columnas: a la izquierda el nombre, a la derecha con que
etiquetas empieza. Sin ninguna, el primer servidor se registra a ciegas y
el acceso se reparte uno a uno.

**La direccion la pone el servidor**, libre a la primera y numerada si ese
nombre ya estaba (`tecnovo-2`), y se cambia despues en Organizacion. La
pantalla ni la manda ni la nombra: es una palabra tecnica que no dice nada
a quien solo quiere otro espacio, y preguntarla convertia un nombre
repetido en un error antes de empezar.

**Donde si se teclea —«Cambiar la direccion»— se comprueba al escribir**, y
si esta ocupada llegan tres libres en una lista, a un clic.

**La plantilla del alta ya ensena el color de cada opcion, y ese color
significa algo.** El rojo es de la criticidad —«atienda esto»—, con el ambar
de advertencia y el pizarra de lo que no debe robar la mirada. El entorno no
toca ninguno de los tres: azul lo serio y en pie, violeta lo aislado donde se
prueba, verde donde se trabaja sin miedo a romper nada. Repetido el rojo en
«Produccion», una maquina critica y una de produccion se leian igual.

No sale del reparto automatico: lo manda el alta (`defineLabel` con
`colors`), porque el reparto no sabe de riesgos. Y asociar «Produccion» con
su color empieza donde se ve por primera vez, no dos pantallas despues.

**Las opciones de una etiqueta se ensenan como fichas, no separadas por
puntos.** «Produccion · Pruebas · Desarrollo» se leia como una frase; en
fichas se ve que son tres cosas entre las que se elige. Y no se mezclan
registros: tres palabras o tres siglas, nunca «Produccion · Pruebas · UAT».

**Lo que solo hace falta la primera vez va detras de un icono de informacion**
(`components/info-hint.tsx`), no en una linea bajo cada titulo: una
explicacion por campo llena el formulario de texto que estorba a quien ya
sabe para que sirve. El globo sigue el tema con los colores del popover: el
que trae shadcn va invertido y, blanco sobre la pantalla oscura, una frase
entera deslumbraba.

**LA ORGANIZACION SE CREA DONDE SE CAMBIA.** El selector de la barra lista
las tuyas y ademas las crea: es donde ya se mira cuando se piensa «quiero
otro espacio». Lo demas —nombre, direccion, cifras y la baja— vive en
`/app/organization`, la de la sesion actual, porque cada organizacion es un
contexto entero y no una fila de una lista.

**TODA PANTALLA DE AJUSTES SE MONTA CON LAS MISMAS PIEZAS.**
`SettingsSection` + `SettingsRow` (`components/settings-section.tsx`): titulo
en versalitas, marco redondeado, icono por fila y el boton a la derecha. La
cuenta y la organizacion se visitan seguidas; con dos marcos distintos,
cambiar de una a otra se lee como un salto.

**Un ajuste de si o no es un interruptor, con su estado escrito al lado**
(`SettingsSwitchRow`). «Activado» en gris junto a un boton no se distinguia
de «Desactivado»; el interruptor se lee de un vistazo y el texto lo confirma
para quien no distingue el color. Lo que pide confirmar —los dos pasos— sigue
siendo boton y dialogo.

**Elegir entre cientos abre con lo probable arriba y lo elegido a la vista.**
La zona horaria ofrece primero la actual y la del equipo, y la lista abre
centrada en la elegida. Cada zona se lee como la gente la conoce —«Lima, hora
de Peru»— y con la hora que es alli, que confirma mejor que un desfase. Las
ciudades con nombre en espanol lo llevan —Tokio, Londres, Nueva York— y se
encuentran tambien por el ingles, que va en la segunda linea.

**La actividad de la cuenta tiene pagina propia** (`/app/settings/activity`),
y se llega desde el menu de la cuenta, junto a «Configuracion»: quien sospecha
que alguien entro con su contrasena la busca ahi. Se filtra como la auditoria
—tipo, equipo, busqueda y periodo— y cada fila dice el equipo, la IP y la
fecha. Un inicio dice ademas si su sesion sigue abierta: uno que no se
reconoce y sigue dentro es lo primero que hay que cerrar. Un equipo nuevo va
en ambar: es la senal de alarma. En Configuracion quedan los cinco ultimos con
«Ver toda la actividad».

**En movil el boton de cambiar es un lapiz.** La palabra se come el dato que
hay al lado, que es lo que se venia a leer. Lo que no es «Cambiar» —«Activar»,
«Desactivar»— conserva su verbo, porque un lapiz ahi mentiria.

**Un ajuste, un dialogo.** En la organizacion, el avatar, el nombre y la
direccion se cambian por separado: nadie entra a ajustes a cambiar las tres,
y un formulario con todas obliga a repasar lo que no se venia a tocar. El
alta, al reves, pide solo el nombre: la direccion se propone y el color viene
puesto, y los dos se ajustan despues.

**Lo que no se puede hacer se explica antes de intentarlo.** El espacio
personal no ensena la zona de baja; una organizacion con servidores la
ensena apagada y dice cuantos hay que quitar primero. El backend lo vuelve a
comprobar: esconder el boton es cortesia.

**DOS PAGINAS QUE SE PARECEN SE CONFUNDEN.** El servidor y la credencial se
alcanzan desde los mismos sitios, asi que no se pintan igual: el servidor
lleva nombre en negrita y pestanas a todo el ancho; la credencial, usuario en
monoespacio, su ficha fija a un lado y las pestanas —sesiones y
estadisticas— solo en el panel de al lado. Las dos llevan sus metricas y la
misma tabla de historial (`SessionsHistory`) y las mismas piezas de uso
(`usage-parts`): lo que cambia es la forma, no lo que se puede saber.
Confundirlas es abrir la terminal equivocada.

**CADA ENTIDAD TIENE PAGINA PROPIA; EL PANEL LATERAL ES LA VISTA RAPIDA.** El
servidor vive en `/app/servers/:id` con pestanas que son rutas hijas: se
enlaza, se guarda, el «atras» del navegador vuelve a el. Otra pantalla que
quiera «llevar al servidor» enlaza a esa URL con `buildServerPath`, nunca a
la lista con un parametro. El panel lateral desde la lista es un vistazo: no
se le anaden secciones, se enlaza a la pagina.

**VOLVER ES VOLVER A DONDE SE ESTABA.** Una flecha de vuelta lleva a la vista
desde la que se entro; si se entro directo, no hay flecha y la X cierra.
Abrir el panel ya en credenciales desde el icono de terminal ensenaba, al
volver, un resumen que nadie habia visitado. En una pantalla entera, como la
terminal, `useVolver(respaldo)`: atras si hay historial de la app, al padre
si se llego por enlace directo.

**UNA FICHA RESUME, NO LISTA.** Hasta cinco elementos caben en la ficha;
mas, se cortan con «Ver las N» y viven en una vista propia dentro del mismo
panel, con busqueda y con vuelta atras. Veinte credenciales seguidas no son
una ficha, son una lista mal puesta.

**EL RELLENO DEL ACENTO ES DE LA ACCION DE LA PANTALLA, Y HAY UNA.**
«Invitar», «Anadir servidor», y la del vacio cuando no hay nada que mirar
todavia. Lo que vive dentro de una fila o de una seccion va en `outline`
`sm` —«Nuevo grupo», «Nueva etiqueta», «Anadir opcion», «Anadir a alguien
del equipo»— y los iconos de la fila en `ghost` `icon-sm`. Dos teales
compitiendo hacen que ninguno signifique nada, y el vacio de un grupo con
el mismo boton que la cabecera se leia como otra pantalla.

**TODO DIALOGO PONE LA ACCION PRIMERO Y «CANCELAR» DESPUES**, y el cancelar
va en `outline`. Dos ordenes distintos en la misma app se pulsan mal, y en
`ghost` no parecia un boton sino texto suelto al lado del que si lo era.
Vale igual para el «Cancelar» de una fila en edicion y para el de
`ConfirmDialog`, que va por `AlertDialogCancel`.

**QUITAR UN ACCESO TAMBIEN CONFIRMA.** Un aspa suelta en una fila cortaba el
acceso de alguien de un clic perdido, y el aviso llegaba cuando ya estaba
hecho. El dialogo dice a que alcanzaba —«Conectar sobre dev-sunmetals @ VPS
Mentora»— y si lo pierde una persona o un grupo entero.

**NADA SE BORRA AL PRIMER CLIC.** Toda baja pasa por `ConfirmDialog`, que
dice punto por punto que se va (`describeServerLoss`,
`describeCredentialLoss`) y, cuando lo borrado arrastra hijos o historial,
exige teclear su nombre, como GitHub. Un enlace suelto confirma sin teclear;
un servidor con credenciales, no. El boton dice el verbo y el que: «Eliminar
servidor», «Quitar enlace».

Esos puntos van en la caja «Que pasa», con el icono de aviso encima del
titulo. Un dialogo que solo pregunta se lee como un tramite: con lo que hay
delante, quien confirma sabe que esta cerrando o borrando.

**La foto de la cuenta se cambia desde la propia foto**, no desde una fila
con la palabra «avatar»: es donde se busca. El recorte es el mismo de la
organizacion (`components/avatar-crop-dialog.tsx`), que subio al kit al
tener dos consumidores.

**El correo se cambia en dos tiempos y el codigo va al correo nuevo.** Es la
unica forma de comprobar que quien lo pide puede leerlo, y mientras tanto la
cuenta sigue entrando con el de siempre: un descuido al teclear no puede
dejar fuera a nadie. Pedirlo exige la contrasena, porque con la sesion
abierta el correo es la llave de la cuenta.

**Lo que se gestiona uno a uno tiene su propio panel lateral.** Los enlaces
de un servidor o de una credencial se ven, se anaden, se editan y se quitan
en `LinksSheet`, guardando al momento y con el mismo armazon que la ficha:
un panel a la derecha, nunca un modal en medio. El formulario de alta admite varios de
golpe porque recien creado conviene cargarlos todos; el de edicion no los
mezcla: «Editar servidor» edita el servidor.

**En un panel lateral, el alta cuelga del pie.** Ancho completo, boton
primario y separada por una linea, igual en las credenciales de un servidor
que en los enlaces (`LinksEditor` con `alPie`). En una pagina, en cambio, va
bajo la lista y en secundario: alli no hay pie que ocupar.

**La accion primaria de un listado vive en su cabecera.** «Anadir servidor» y
«Anadir credencial» estan en el mismo sitio de la pantalla. Cuando falta el
contexto —una credencial necesita servidor— lo pregunta el propio formulario
como primer campo; encadenar dos ventanas para elegir antes de escribir es
una parada de mas. Si no hay donde crearla, el boton no se ofrece y el vacio
lleva a registrar el servidor.

**Dentro de un panel, la lista no lleva marco.** Una tarjeta con borde dentro
del panel es una caja dentro de otra, y las dos lineas se pisan: las filas van
de lado a lado, separadas por una raya, y con el mismo margen lateral que su
cabecera. El marco se queda para las listas que viven en una pagina, donde no
hay ninguna caja alrededor.

**En un panel, la barra de scroll empieza debajo de la cabecera.** El panel
es una columna: cabecera y pie fijos, y en medio `SidePanelBody`, que es lo
unico que rueda. Con el panel entero desplazandose, la barra corria tambien
junto al titulo y se salia del marco.

**Todo panel lateral y todo dialogo de formulario se montan con su armazon.**
`SidePanelContent` + `SidePanelHeader` + `SidePanelBody`
(`components/side-panel.tsx`) y
`FormDialogContent` (`components/form-dialog.tsx`): cabecera fija al bajar y
cierre `CloseButton` de 36 px que solo ensena el foco con teclado. El cierre
que trae shadcn va apagado con `showCloseButton={false}`; `components/ui` no
se toca.

**El boton de terminal de una credencial va relleno del acento.** Es la
excepcion declarada a «un solo teal por pantalla»: entrar a la maquina es a
lo que se viene, y en gris se perdia entre el galon de los enlaces y el menu
de tres puntos.

**La accion del dia a dia va a la vista, no en el menu.** En una fila de
servidor, el icono de terminal abre el panel de credenciales, cada una con su
boton de terminal y sus enlaces: un desplegable para elegir credencial
esconde justo lo que se quiere ver. El menu de tres puntos guarda lo que se
consulta de vez en cuando y lo que se cambia. En un enlace, abrirlo es la fila entera
y el menu guarda copiar la direccion, editar y quitar.

**El primer uso no es una lista vacia, es el principio.** La vista sin datos
explica los tres pasos y ofrece un solo boton. «Todavia no hay X» se reserva
para cuando ya se sabe que es X.

**El vacio se distingue por su causa.** No es lo mismo no tener nada que no
encontrar: quien filtro necesita saber que la lista existe, no que empiece
de cero.

**LOS TRES LAYOUTS SON RUTAS ANIDADAS**, el equivalente de los layouts de
Vue o Nuxt. Cada uno pinta su armazon y deja el hueco con `<Outlet />`:

- `PublicLayout` — cabecera con navegacion y pie. Se indexa.
- `GuestLayout` — sin navegacion: en login y registro no hay nada mas que
  hacer, y una salida a mano es una alta perdida.
- `AppLayout` — barra lateral, selector de organizacion y menu de cuenta.

**LA BARRA LATERAL SE PLIEGA, Y EN MOVIL ES UN CAJON ENTERO.** En escritorio
`AppSidebar` pasa de 17.5rem a un carril de 4rem con solo iconos, y la
eleccion se recuerda (`use-sidebar.ts`, `localStorage`).

**LA BARRA LLEVA LO QUE SE REPITE, NO SOLO LAS SECCIONES.** Debajo del menu,
«Usadas hace poco»: las cinco ultimas credenciales con las que se entro
(`RecentCredentials`), porque casi siempre se vuelve a la misma maquina y
buscarla en la lista es un rodeo. Al pie, la cuenta y el tema: es donde se
busca la cuenta desde que lo hacen asi las aplicaciones que se usan a diario,
y ademas el hueco de abajo deja de estar vacio. Por eso **en escritorio no
hay cabecera superior**: no le quedaba nada que llevar.

**PLEGADA NO SE ABRE SOLA: SE AMPLIA CON UN CLIC.** Todo el carril que no
sea un icono es zona de ampliar —`Ampliar` en `AppSidebar`, tendida bajo el
contenido—: el hueco de en medio, los margenes de un enlace, el aire entre
uno y otro. Lo anuncia el cursor de ensanchar (`ew-resize`) y lo hace un
clic. Los iconos dicen su nombre con un tooltip.

Se probo a que se asomara sola al rozarla y se descarto: abrirse sin
pedirlo tapa el trabajo, y al retirarse encoge debajo del cursor quieto, lo
que hace que el navegador mande eventos de raton que nadie provoco. De ahi
salian los parpadeos al pulsar la cuenta o al elegir una seccion. **Un clic
no tiene ese problema: pasa cuando la persona quiere.**

Debajo de `lg` no hay barra fija: el menu abre un `Sheet` que **cubre la
pantalla entera** y se cierra con su X. Media pantalla deja el contenido a
medias detras y nadie sabe si sigue navegando.

**EL LOGIN PUEDE TERMINAR EN DOS SITIOS, Y SE DECLARA ASI.** `signIn`
devuelve `{ estado: 'listo' }` o `{ estado: 'dos_pasos' }`, nunca un objeto
con las dos cosas a medias: con la verificacion puesta no hay tokens que
guardar, hay un desafio de cinco minutos y un codigo que va al correo. El
segundo paso es `TwoFactorStep`, dentro de la misma pantalla —no otra ruta—:
el desafio vive en memoria y una URL propia se recargaria vacia.

**Toda pantalla de «revise su correo» ofrece reenviar y corregir la
direccion.** Un correo que no llega —o una letra mal tecleada— deja a esa
pantalla sin salida, y la unica escapatoria seria empezar de cero. El
reenvio espera un minuto entre intentos y la correccion vuelve al formulario
con lo escrito.

**Volver atras desde el codigo es rehacer la contrasena, no reenviar.** No
hay endpoint de reenvio, y anadirlo daria una forma de pedir codigos sin
volver a demostrar que se sabe la clave.

**Un ajuste que puede dejar fuera al dueno se activa en dos tiempos.** La
verificacion en dos pasos pide el codigo antes de quedar puesta, asi que si
el correo no llega se descubre ahora y no en el siguiente login.

**Quitar una proteccion pide la contrasena, no un clic.** El dialogo de
desactivar los dos pasos es propio, no un `ConfirmDialog`: enumera que
cambia y exige teclear la clave, igual que borrar un servidor exige teclear
su nombre. Con la sesion abierta, un boton suelto es todo lo que
necesitaria quien encuentra el equipo desbloqueado, y el backend lo vuelve
a comprobar.

**EL GUARD NO ES CONTROL DE ACCESO.** `RequireAuth` y `RequireGuest` evitan
pantallazos y redirigen; quien decide que ve cada quien es el backend en cada
peticion. Una pantalla escondida sigue siendo alcanzable.

**CREDITOS DICE CUANTO QUEDA Y DE DONDE SALE LO QUE SE GASTA.** Tres cifras
—saldo, gastado este mes, gasto medio—, el uso de los ultimos 30 dias en
barras, «Como se cobra» con las tarifas vigentes y los movimientos. Quien
administra lo ve todo y recarga; al resto le basta el saldo y como se cobra.
En el grafico, lo que cupo en lo gratuito va en claro: se uso y no costo. Y
los plazos largos no se dan en dias: «1031 dias» obliga a hacer la cuenta.

**RECARGAR ES PEDIR, Y SE DICE ASI.** Sin pasarela, «Solicitar recarga» deja
la peticion pendiente y finanzas la acredita. Hasta entonces la pagina la
muestra arriba, con «Cambiar paquete». Cada paquete dice cuanto dura al
ritmo de gasto de ahora: comparar por creditos obliga a hacer la cuenta.

**EL SALDO ES UNA SOLA CONSULTA** (`useSaldo`), con cinco minutos de
vigencia: lo leen la pagina, el aviso de arriba y los dialogos, y solo
cambia con el cobro de cada noche o al recargar.

**LA ORGANIZACION ACTUAL ATRAVIESA TODO.** Creditos, auditoria, miembros y
servidores se piden con `?organization=<slug>`. Va en la clave de consulta:
sin ella, cambiar de organizacion enseña los datos de la anterior.

**LA HORA ES LA DEL PERFIL, NO LA DEL EQUIPO.** Todo llega en UTC y cada
persona lo lee en su zona (`user.time_zone`). La sesion la fija en
`lib/zona-horaria.ts` antes de pintar, y de ahi la toman `lib/format.ts` y
`lib/periods.ts`: las fechas y el «Hoy» de los filtros salen en esa zona, y el
servidor corta los dias en la misma. Un dia del calendario —el consumo de un
dia— no es un instante: se escribe en UTC para que ninguna zona lo corra. Sin
zona en el perfil se toma la del navegador sin preguntar; si luego el
navegador esta en otra, se pregunta una vez por zona: «Usar» o «Mantener».

**LA AUDITORIA ES DE QUIEN ADMINISTRA, Y SE LEE SIN TRADUCTOR.** Es quien
entro a que servidor: la barra no la ofrece a un miembro, y si llega por
enlace se le dice por que no, en vez de una tabla que el servidor negaria.
Cada fila es una frase que arma el servidor —la misma del Excel—, con el icono
de lo que toca delante: el candado o la llave de una credencial, como en su
fila, y si no, el de su tipo; el intento denegado va en rojo y con su motivo debajo,
que el color solo no basta. Se monta como todo listado, con periodo, tipo,
persona y busqueda, y «Exportar a Excel» descarga lo filtrado, con formato.

**EL SERVIDOR TIENE SU PESTANA DE ESTADISTICAS.** El historial dice que paso
el martes; las estadisticas, en que estado esta la maquina: quien entra, con
que credencial, cuanto se ha estado conectado, que sesiones acabaron con
error, que intentos se denegaron y **que credenciales no usa nadie** —una
llave que nadie usa es una que sobra, y no se veia en ningun sitio—.

Es una sola peticion (`/servers/{id}/stats`): la cuenta la hace el servidor,
porque calcularla en el navegador exigiria traerse el historial entero.

**EL PERIODO SE ELIGE CON ATAJOS, NO ESCRIBIENDO DOS FECHAS.** Hoy, ayer,
esta semana, este mes, el anterior, seis meses, este ano, el pasado, y
«Personalizado», que abre el «desde» y el «hasta» al lado. Es el mismo
control en el historial y en las estadisticas (`components/period-filter.tsx`),
y manda el rango ya resuelto: quien lo consume solo sabe de fechas.

El calculo del atajo vive en `lib/periods.ts` y esta probado: la semana
empieza en lunes, el mes anterior termina en su ultimo dia —28, 30 o 31— y
el dia es el de quien mira, que a las nueve de la noche en Lima `toISOString`
ya dice manana y «Hoy» salia vacio.

**EL HISTORIAL DE UN SERVIDOR ES UNA TABLA, NO UNA LISTA.** Quien entro, con
que credencial, cuando, en que acabo, desde donde y cuanto duro, cada uno en
su columna y a lo ancho de la pantalla: en la pestana se compara —quien entra
mas, que credencial falla—, y en una lista estrecha eso no se ve. El resumen
si va en lista: alli son tres filas y solo se mira la ultima.

**CADA SESION DICE EN QUE ESTADO ESTA.** Abierta, cerrada o con error, con su
punto de color y **su palabra al lado** —el color solo no lo distingue todo el
mundo—. Sin eso, una sesion que sigue viva y una que se cayo se leian igual, y
el historial dejaba de servir para lo que existe: saber que paso. Lo pinta
`SesionesLista`, que usan el resumen, la pestana, el panel y la credencial.

**LA TERMINAL ES WEBSOCKET Y VA APARTE.** `xterm.js` pesa y solo hace falta en
su pantalla: se carga diferida siempre, nunca desde el arbol comun.

Y **no vive dentro del `AppLayout`**: una terminal quiere la pantalla entera,
sin barra lateral ni contenedor de ancho maximo. Es una ruta hermana de
`/app` bajo `RequireAuth`, con cabecera propia de una linea. Lo que decide
sin tocar DOM ni red —URL, codigos de cierre, `cd` inicial— esta en
`features/terminal/socket.ts` y se prueba sin montar nada.
