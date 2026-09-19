# Tech Stack: React Hook Form + Zod

DIRECTIVA: el esquema del cliente avisa antes de la vuelta al servidor. No
sustituye a la validacion del backend, que es la unica que manda.

**TABLA ANTI-VANILLA:**

| Prohibido                                | Usar                                   |
| ---------------------------------------- | -------------------------------------- |
| `useState` por cada campo                | `useForm`                              |
| Validar en el `onSubmit` a mano          | `zodResolver`                          |
| `z.string().email()`                     | `z.email()` (Zod 4)                    |
| Mensaje de error en ingles               | mensaje propio en el esquema           |
| Descartar `errors` del backend           | `applyFieldErrors`                     |
| `disabled` sin indicar por que           | texto o `aria-describedby`             |
| Boton de envio sin estado de espera      | `isSubmitting` / `isPending`           |
| `required` solo en el atributo HTML      | el esquema, mas el atributo            |

**REGLAS:**

1. **EL ESQUEMA VIVE JUNTO AL FORMULARIO,** no en un archivo de esquemas
   compartido. Un esquema reutilizado en dos formularios acaba con campos
   opcionales para contentar a los dos y deja de validar.

2. **LOS MENSAJES DEL ESQUEMA SON PARA QUIEN LOS LEE.** En español, y dicen
   que hacer: `'Usa al menos 8 caracteres.'`, no `'String too short'`.
   Aplica `core/07` §4: sin jerga y con la accion.

3. **LOS ERRORES DEL BACKEND VUELVEN AL CAMPO.** `applyFieldErrors` reparte
   `errors` del sobre sobre el formulario, y devuelve como aviso general lo
   que no corresponde a ningun campo.
   - Descartar ese sobrante deja el formulario fallando sin decir por que.

4. **EL ENVIO SE BLOQUEA MIENTRAS ESTA EN VUELO.** Doble clic en "Crear
   servidor" crea dos servidores: el backend no distingue las dos
   peticiones.

5. **UN DIALOGO REUTILIZADO SE RECARGA AL ABRIRSE.** El mismo componente
   sirve para alta y edicion; sin `reset` en la apertura, la segunda vez
   muestra los valores de la primera.

6. **EL CAMPO ERRONEO SE MARCA Y SE ANUNCIA.** `aria-invalid` en el input y
   el mensaje enlazado. Pintarlo de rojo y nada mas no llega a quien usa
   lector de pantalla.

7. **LA PISTA Y EL ERROR OCUPAN EL MISMO SITIO.** Mientras no hay error se
   ve la pista (`aria-describedby`); cuando lo hay, el error la sustituye.
   Apilar los dos mueve el formulario entero hacia abajo.

8. **LO OPCIONAL SE DICE EN LA ETIQUETA,** no se deduce de la ausencia de
   asterisco. Si casi todo es obligatorio, se marca lo opcional.

9. **EL PLACEHOLDER NO ES UNA PISTA.** Desaparece al escribir, tiene poco
   contraste y **un valor plausible se lee como campo ya relleno**: quien
   ve "Ana Fernández" en gris cree que el dato ya esta puesto y pasa de
   largo.

   | Placeholder | Vale? |
   |---|---|
   | `Ana Fernández` en un nombre | No: parece un dato real |
   | `Abitech Perú` en una organizacion | No: parece un dato real |
   | `10.0.0.5` en una IP | Si: se lee como formato |
   | `ana@acme.pe` en un correo | No: parece una cuenta real |
   | `nombre@correo.com` en un correo | Si: ensena la forma y nada mas |

   Y el dominio tambien dice cosas: `tu@empresa.com` deja pensando si hace
   falta un correo de trabajo. El de ejemplo no puede sugerir una condicion
   que no existe.

   La regla: **muestra formato, nunca un valor verosimil.** Lo demas va a
   la etiqueta —que dice que se espera— y a la pista permanente —que dice
   por que hace falta y da el ejemplo—.

10. **LA ETIQUETA NOMBRA EL DATO, NO SALUDA.** "Nombre y apellidos" dice
   que teclear; "¿Como te llamas?" suena mejor y deja la duda de si basta
   el nombre de pila. La calidez va en el titulo de la pantalla.

11. **`autoComplete="off"` EN TODOS LOS CAMPOS.** Decision del proyecto, y
   todo campo nuevo la sigue: sin ella un formulario tendria un
   comportamiento distinto al resto.

   Lo que cuesta, para que nadie lo redescubra:
   - Los gestores de contraseñas dejan de ofrecer y de guardar.
   - Se incumple **WCAG 1.3.5 (Identify Input Purpose, AA)**, que pide el
     token en los campos de datos personales del propio usuario.
   - En los campos de contraseña **no hace nada**: Chrome, Firefox y
     Safari ignoran `off` ahi a proposito.

   Revertirlo es cambiar `off` por el token real —`email`,
   `current-password`, `new-password`, `name`— campo por campo.
