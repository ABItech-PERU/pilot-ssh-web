# Dominio (Pilot SSH)

DIRECTIVA: control de acceso a servidores para equipos. No es "un cliente SSH
web": es quien entra a que maquina, con que credencial, cuanto tiempo, y con
registro de todo.

La interfaz usa las palabras del negocio. Inventar sinonimos en la pantalla
rompe la conversacion con el cliente y con el backend.

## Vocabulario

| En el codigo | En la pantalla | No es |
|---|---|---|
| `Organization` | Organizacion | Una empresa juridica |
| `Membership` | Miembro | Una cuenta |
| `Server` | Servidor | Un servidor fisico propio |
| `ServerUser` | **Credencial** | Un usuario de la plataforma |
| `ServerShare` | Comparticion | Una membresia |
| `TerminalSession` | Sesion | Un login |
| `CreditWallet` | Saldo | Una factura |
| `links` (de servidor o credencial) | **Enlaces** | Un permiso: son URLs que se abren |

**«Acceso» significa permiso, y nada mas:** quien entra a que maquina. Las
URLs que cuelgan de un servidor o de una credencial son **enlaces**. Se
llamaban «accesos», y la misma palabra decia dos cosas en la misma pantalla.

**Los enlaces viven en dos sitios y no hay una entidad aparte.** En el
servidor, los enlaces de la maquina entera: el panel, el monitoreo. En la
credencial, lo que se abre con ese usuario —su web, su base de datos, su
repositorio— mas la carpeta a la que entra la terminal. Un formulario de
«sitio» con nombre, entorno y credencial repetia lo que ya decia la
credencial y no tenia donde poner lo del servidor: se quito.

**En la barra lateral, «Credenciales» y «Equipo» son dos cosas.** El equipo
son personas de la plataforma, con sus grupos; Credenciales son los usuarios
con los que se entra a cada maquina. La lista transversal de credenciales existe para
responder «¿en que servidor esta mi usuario?» sin abrir uno por uno.

**`ServerUser` es la trampa de nombres del proyecto.** Es una credencial
(`root@10.0.0.5`), no una persona. En la interfaz **nunca** se escribe
"usuario" para referirse a ella: se escribe "credencial". Quien abre la sesion
es otra cosa y aparece en la auditoria.

## Tenencia

Cada usuario recibe al registrarse una **organizacion personal**. Puede
pertenecer a varias con **rol distinto en cada una** (modelo Jira / ClickUp).

El selector de organizacion no es un adorno: es el contexto de todo lo que se
pide despues. Desde el se crean, y en `/app/organization` se editan y se dan
de baja.

**Quien administra cambia el nombre; solo la propietaria cambia la
direccion** —es la identidad, y viaja en cada peticion— **y solo ella la
elimina**. La baja es suave y exige que este vacia de servidores: el libro
mayor y la auditoria son append-only y sobreviven. El espacio personal no se
elimina nunca.

## Como se da acceso

Una sola frase: **a quien** se le da **que**, con **que nivel**, **hasta
cuando**. Lo demas son formas de escribirla.

| Alcance | Llega a |
|---|---|
| La organizacion | Todas sus maquinas, y las que se registren manana |
| Una etiqueta | Todo lo que la lleve, maquinas y credenciales |
| Un servidor | Esa maquina y todas sus credenciales |
| Una credencial | **Solo esa**, aunque la maquina tenga cinco |

| Nivel | Permite |
|---|---|
| **Ver** | Aparece en su lista. No abre terminales |
| **Conectar** | Abre terminales |
| **Gestionar** | Ademas edita el servidor, sus credenciales y sus enlaces |

**Se concede a un grupo; a una persona, para lo puntual.** Con 20 maquinas y
10 personas, ir una a una son 200 casillas que nadie mantiene.

**Y solo a quien esta en el equipo, o invitado a el.** Compartir no mete
gente: la mete Equipo, invitando. Una concesion a alguien sin membresia no le
sirve —el selector de organizacion sale de las membresias, asi que no llega a
ver la maquina— y ademas lo deja invisible: aparecia en el servidor y en
ningun otro sitio. El backend lo rechaza y manda a invitar.

A una invitacion sin aceptar si se le concede: la fila espera a nombre de la
invitacion, no da acceso hasta que entre, y al aceptar pasa a su nombre.

**Salir del equipo se lleva lo concedido.** Sin membresia esas filas no dan
acceso a nada, y volver a invitar a esa persona se lo devolveria sin que
nadie lo decidiera.

**Las etiquetas se eligen, no se teclean.** La organizacion define su catalogo
en `/app/team` → Etiquetas —como se llama y entre que opciones se elige— y
los formularios del servidor y de la credencial las ofrecen en un selector.
Tecleadas, «Produccion» y «Produccon» serian dos etiquetas distintas y el
acceso dado a una dejaria fuera a la otra.

**Se escriben como las lee una persona**, con mayusculas y tildes: se teclean
una sola vez, al definirlas.

**El entorno es de la credencial.** Una maquina aloja el UAT y la produccion
a la vez. La etiqueta de la maquina alcanza a todas sus credenciales; la de
una credencial, solo a ella.

**No se elimina una etiqueta que sostiene algo.** La papelera esta apagada
mientras este puesta o reparta accesos: quitarla dejaria fuera a quien
entraba por ella sin nada en pantalla que lo explicara.

**Renombrar, en cambio, si vale siempre**: el nombre nuevo se aplica donde ya
estuviera puesto. Corregir «Produccon» no puede costar el acceso.

**Ninguna organizacion nace con grupos, y nadie entra con acceso.** Se empieza
por nada: quien invita decide si da toda la organizacion, algunos grupos o un
servidor concreto. «Toda la organizacion» es un **alcance**, no un grupo: hubo
uno especial para eso y ningun nombre le cuadraba sin sonar a otra cosa.

**El rol suma, no resta.** Propietario y administrador entran a todo lo suyo;
el resto, a lo que digan sus concesiones. Hubo un rol «Solo lectura» que
recortaba el acceso, y la pantalla parecia contradecirse: el rol decia una
cosa y su grupo otra. Mirar sin entrar es un **nivel**, no un rol.

Al pintar lo que alguien puede hacer no se deduce de su rol: se pregunta al
backend.

## Roles

Dos niveles independientes que no se consultan cruzados:

- **Plataforma**: tres permisos que se combinan —Atención, Finanzas y
  Personal— (`can_attend_customers`, `can_manage_finances`,
  `can_manage_staff`). Sin ninguno, es un cliente. Deciden qué enseña el
  panel interno (`features/backoffice/permisos.ts`); sin dos pasos, el panel
  enseña cómo activarlos y nada más.
- **Organizacion** (`role` de la membresia): owner, admin, member, viewer.
  Decide que se puede hacer dentro de esa organizacion.

| Rol | Etiqueta en pantalla |
|---|---|
| `owner` | Propietario |
| `admin` | Administra |
| `member` | Miembro |

**Esconder un boton por rol es cortesia, no seguridad.** Se hace para no
ofrecer lo que va a fallar, nunca como control.

## Estados de la organizacion

Nace `active`: el alta no pasa por revision manual. `suspended` la pone el
personal con motivo, y llega con su `account_message` ya escrito para mostrar
tal cual.

**Una organizacion que no esta activa no abre terminales.** El corte esta en
el backend; la interfaz solo lo explica.

## Creditos

Prepago, **sin caducidad y sin planes**. Se paga el dia que se usa: cada
persona que abre una terminal y cada servidor en el que se abre, pasado lo
gratuito de cada dia.

- **Donde se anade no se habla de dinero.** Una linea de coste en
  «Invitar» o «Anadir servidor» hacia pensarlo dos veces antes de anadir,
  justo lo que el cobro por uso quiere evitar. El precio vive en Creditos.
- **Sin saldo hay siete dias de margen**; despues, solo lo gratuito. No se
  borra nada, y el aviso lo dice asi, sin dramatizar.
- **Que se acaba se le dice a quien puede recargar; que se acabo, a todos**
  (`BalanceNotice`): a todos les cambia que terminales se abren.
- **Nunca haber tenido creditos no es haberse quedado sin ellos** (`empty`):
  vive de lo gratuito y no se le alarma.
- **Verificar el correo es un paso del alta, y se puede dejar para despues.**
  Sin el no llegan el bono ni lo gratuito, asi que un aviso arriba lo recuerda
  en cada pantalla hasta hacerlo (`EmailVerificationNotice`).
- La interfaz no habla de «plan» ni de «plan mensual»: no existen.

## Alta en dos pasos

1. Correo y contraseña. Nada mas: cada campo extra aqui cuesta altas.
2. Nombre —obligatorio, aparece en la auditoria— y equipo, opcional.

El estado lo manda el backend en `onboarding`: `next_step` dice que falta. La
interfaz no lo deduce por su cuenta.

**El nombre del paso 2 no se puede omitir.** Es lo que aparece en la
auditoria y al compartir un servidor: sin el, el registro dice que entro un
correo y no una persona. La organizacion si se salta, que esa se crea despues
sin perder nada.

## Lo que nunca se pinta

**La credencial en claro.** La API devuelve `has_password` y `has_private_key`,
booleanos. No hay pantalla que muestre una contraseña de servidor.

**La salida de la terminal, guardada.** No se graba: capturaria las
contraseñas tecleadas en `sudo`.
