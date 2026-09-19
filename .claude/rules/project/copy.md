# Copy (Pilot SSH Web)

DIRECTIVA: la pantalla la lee una persona que quiere hacer algo, no un
desarrollador leyendo el código. Las palabras son material de diseño: una
etiqueta rara cuesta un usuario perdido, no un ticket.

Aplica `core/04-language-standards.md`. Esto añade la voz de este producto.

## Español de verdad

1. **CON TILDES.** `contraseña`, `sesión`, `créditos`, `dirección`,
   `añadir`, `último`, `organización`. Escribirlas sin tilde delata que el
   texto salió del código y no de alguien escribiendo para el usuario.

   El backend las omite en los identificadores de Python; **en la pantalla
   no**. Son sitios distintos con reglas distintas.

2. **SIGNOS DE APERTURA.** `¿No tienes cuenta?`, `¿Cómo te llamas?`. Un
   `?` suelto al final es puntuación de otro idioma.

3. **`ñ` DONDE TOQUE.** `añadir`, `contraseña`, `compañeros`, `año`.

## Las palabras que la gente ya conoce

La terminología se toma de las apps que el usuario ya usa, no del dominio
técnico ni de la traducción literal del inglés.

| No escribir | Escribir |
|---|---|
| Entrar / Acceder | **Iniciar sesión** |
| Salir / Desconectar | **Cerrar sesión** |
| Registrarse ahora / Darse de alta | **Crear cuenta** · **Regístrese gratis** |
| La olvidé / Recuperar clave | **¿Olvidó su contraseña?** |
| Ajustes de la cuenta | **Configuración** |
| Guardar cambios exitosamente | **Guardar cambios** |
| Aceptar | El verbo de la acción: **Eliminar**, **Añadir** |

Un botón dice **exactamente** lo que va a pasar al pulsarlo, y el aviso
posterior lo confirma en pasado: "Añadir servidor" → "Servidor añadido."

## Prohibida la jerga de implementación

El usuario no sabe —ni tiene por qué— qué es una API, un token o un
endpoint. Nombrarlos convierte un mensaje en un problema.

| No escribir | Escribir |
|---|---|
| Nunca salen de vuelta por la API | Nadie puede verlas, ni nosotros |
| Credenciales cifradas | Sus contraseñas, protegidas |
| El backend ya lo soporta | Estará disponible muy pronto |
| Token inválido / expirado | La sesión terminó. Vuelva a iniciar sesión |
| La huella del host no coincide | Su identidad cambió: bloqueamos la conexión |
| Error 500 / Excepción no controlada | Algo salió mal de nuestro lado |

**Vocabulario del dominio que SÍ se usa**, porque es el del cliente y está
en `domain.md`: servidor, credencial, organización, miembro, terminal,
sesión, créditos, compartir.

**Y no se le inventan sinónimos.** La pantalla decía «máquina» donde la
API, la barra lateral y el cliente dicen **servidor**; leer «a qué máquinas
entra» junto a un botón de «Añadir servidor» hace dudar de si son lo mismo.
Se reserva «la máquina» para cuando se opone al panel —«se quita del panel,
la máquina no se toca»—, que es justo lo que hay que distinguir ahí.

La frontera: **si nombra cómo está construido, fuera; si nombra lo que el
usuario maneja, dentro.**

## Los mensajes del backend no se reescriben

Ya vienen redactados para quien los lee, y el backend tiene una prueba que
busca jerga en ellos. Reescribirlos aquí duplica la regla y las dos
versiones divergen.

Si un mensaje del backend suena técnico, **se arregla en el backend**, no
se parchea en la pantalla.

## Corto

Un texto largo no explica mejor: distrae de lo que hay que hacer.

- **Una pista es una línea.** Un ejemplo o una consecuencia, no las dos:
  «Por ejemplo, root o deploy.» y no «El que usas en el ssh: root, deploy,
  el usuario del sitio en CloudPanel.»
- **La descripción de un diálogo es una frase.** Dice qué se va a hacer;
  el porqué va en la pista del campo al que afecta, si hace falta.
- **Un vacío es dos frases como mucho:** qué falta y el botón que lo
  resuelve.
- **Si algo necesita dos frases para entenderse, el problema es el campo,**
  no el texto. Se arregla el formulario.
- **Verbo y nombre, sin artículo.** «¿Eliminar prd-backmentora?», «Ver
  servidor», «Añadir credencial». Con artículo («¿Eliminar la credencial
  prd-backmentora?») suena coloquial y alarga; el tipo ya lo dice el
  contexto o la frase de debajo.
- **Las fechas de una lista van abreviadas:** «Hace 7 min», «Hace 3 h»,
  «Ayer»; pasada una semana, la fecha: «12 mar». Lo hace `formatRelative`,
  y la fecha exacta se ve al pasar el ratón. «hace 7 minutos» no cabe en
  una columna, y la abreviatura de mes («hace 3 m») se lee como minutos.
  El valor de una celda es un enunciado propio y empieza en mayúscula,
  como el «Nunca» con el que comparte columna.
- **Los pasos de una guía se llaman como los botones que los cumplen:**
  «Añadir credencial», no «Añade la credencial con la que entras». El
  detalle debajo dice qué es, en una línea.

## Lo que se borra aquí no se borra allá

Eliminar un servidor o una credencial **no toca la máquina remota**, y quien
confirma tiene que saberlo en dos frases cortas: «Solo se borra de Pilot SSH.
Su servidor sigue funcionando igual».

«Se quita del panel. La máquina no se toca.» decía lo mismo y no lo entendía
nadie: «el panel» puede ser esta aplicación o el panel del hosting, y «no se
toca» no dice qué **sí** pasa. La segunda versión lo explicaba de más —lo que
no se apaga, lo que no se borra— y volvía a perder al que lo leía: **el «solo»
de la primera frase es lo que tranquiliza,** y la segunda dice qué sigue igual.

**Y lo que se lleva por delante se cuenta, no se enumera:** «5 credenciales»,
no «5 credenciales: prd-backmentora, dev-sunmetals…». Quien va a borrar
necesita el tamaño de lo que pierde, no repasar cómo se llamaba cada cosa.

## No se pregunta lo que el usuario no puede saber

El formulario de compartir pedía un correo y respondía «No hay ninguna cuenta
con ese correo». **Nadie sabe de memoria si una persona tiene cuenta aquí**, así
que el campo pedía un dato imposible y castigaba el intento con un error rojo
al final. Ahora se elige de una lista y el único camino para alguien nuevo es
«Invitar a alguien al equipo».

La regla: **si el sistema lo sabe, lo ofrece; no lo pregunta.**

## Lo que ya tiene se dice al elegirlo, en una línea

Al elegir a alguien en «A quién», la pantalla dice lo que ya puede hacer ahí:
«Ya puede conectar aquí por el grupo "Backend"». Sin eso se repartían accesos
que ya existían.

**Y solo cuenta lo que ya cubre lo que se comparte.** Si tiene menos, lo dice:
«Ya puede conectar solo con uat-sunmetals». Una credencial suelta se anunciaba
como «Ya puede conectar aquí», y la lista de abajo decía otra cosa.

**Solo el dato, y solo cuando sirve.** Hubo un aviso fijo bajo el campo, antes
de elegir a nadie —«"Acceso completo" ya entra aquí con Conectar. Comparta para
dar otro nivel, o a alguien de fuera de ese grupo.»— y no lo entendía nadie:
dos frases antes de hacer nada se leen como un error, no como una ayuda.

## Tono

- **Trato formal, en tercera persona.** "Su cuenta", "inténtelo de nuevo",
  "¿Olvidó su contraseña?". Vale igual en la landing que dentro del panel:
  dos voces en el mismo producto se leen como dos productos.
  - Mejor aún, impersonal cuando cabe: «No se pudo conectar» dice lo mismo
    sin señalar a nadie.
- **Directo, sin disculpas.** "No pudimos conectar" — no "Lo sentimos
  mucho, ha ocurrido un error inesperado".
- **Sin signos de admiración.** "Servidor añadido." basta; "¡Servidor
  añadido!" suena a plantilla.
- **Sin muletillas.** Fuera "exitosamente", "correctamente", "por favor",
  "simplemente".
- **El verbo también tiene registro.** El trato es de usted, pero eso no
  basta: «meta a alguien en el grupo» o «saque a esa persona» son de
  conversación, no de una herramienta que usa una empresa. Se **añade** y se
  **quita**; se **elimina** y se **concede**.
- **Los dos puntos no unen dos frases.** «Cambie la contraseña: alguien más
  la conoce» suena a texto generado, no a alguien escribiendo. O son dos
  frases, o van con un conector: «Cambie la contraseña cuanto antes.
  Alguien más la conoce».
  - Sí valen para lo que de verdad introducen algo: una lista, un dato con
    su etiqueta, un comando.
- **El error dice qué pasó y qué hacer.** "Revise la conexión a internet e
  inténtelo de nuevo", no "Error de red".
- **Nada de emoji** en la interfaz. Los iconos son de lucide.

## Antes de dar una pantalla por terminada

Léela en voz alta como si se la explicaras a alguien que nunca la ha visto.
Si tienes que aclarar una palabra, esa palabra está mal elegida.
