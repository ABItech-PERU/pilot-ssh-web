# Tech Stack: TypeScript

DIRECTIVA: el tipo describe lo que **de verdad** llega, no lo que seria comodo
que llegara. TypeScript comprueba que el codigo es coherente consigo mismo; no
comprueba nada sobre la respuesta del servidor.

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- Type-Driven Development (el tipo antes que la implementacion)
- Make Illegal States Unrepresentable
- Parse, don't validate

**TABLA ANTI-VANILLA:**

| Prohibido                          | Usar                                    |
| ---------------------------------- | --------------------------------------- |
| `any`                              | `unknown` y estrechar                   |
| `as` para callar al compilador     | comprobacion real (`in`, `typeof`)      |
| `!` (non-null assertion)           | comprobar y ramificar                   |
| `enum`                             | union de literales                      |
| `interface` para una union         | `type`                                  |
| `Function`                         | la firma concreta                       |
| `object`                           | la forma concreta                       |
| `catch (error: any)`               | `catch (error)` y `toApiError(error)`   |
| `string` para un rol o un estado   | union: `'owner' \| 'admin' \| ...`      |
| `number` para un id de otra entidad| tipo con nombre si se confunden         |

**REGLAS:**

1. **EL CONTRATO CON LA API VIVE EN `src/types/api.ts`,** y en ningun otro
   sitio. Es un espejo de los serializers del backend.
   - Un campo declarado que el backend no manda llega como `undefined`,
     compila sin queja y revienta en pantalla.
   - Campo nuevo en el backend = campo nuevo aqui, en el mismo trabajo.

2. **LO QUE PUEDE FALTAR SE DECLARA `| null`.** `last_used_at`,
   `expires_at` y `role` faltan de verdad. Declararlos obligatorios obliga
   despues a mentir con `!` en cada uso.

3. **`strict` NO SE RELAJA.** Ni `noUncheckedIndexedAccess`, ni
   `noUnusedLocals`. Un acceso por indice devuelve `T | undefined` porque
   eso es lo que devuelve en tiempo de ejecucion.

4. **LOS ESTADOS IMPOSIBLES NO SE PUEDEN ESCRIBIR.** Antes de un objeto
   con banderas sueltas que se contradicen, una union discriminada.

   ```ts
   // Permite cargando y error a la vez, que no existe
   type Mal = { cargando: boolean; error?: string; datos?: Server[] }

   type Bien =
     | { estado: 'cargando' }
     | { estado: 'error'; error: ApiError }
     | { estado: 'listo'; datos: Server[] }
   ```

5. **LOS TIPOS SE IMPORTAN COMO TIPOS.** `import type { Server } from ...`.
   Lo exige `verbatimModuleSyntax` y evita arrastrar el modulo al bundle
   solo por una anotacion.

6. **EL RETORNO PUBLICO SE INFIERE; EL DE UN SERVICIO SE DECLARA.** En una
   funcion exportada que cruza capas, el tipo de retorno explicito es el
   contrato: cambiarlo sin querer se convierte en error de compilacion.

7. **`zod` VALIDA LA ENTRADA DEL USUARIO, NO LA RESPUESTA DEL SERVIDOR.**
   El backend ya valida y devuelve su sobre de error; repetir el esquema
   aqui duplica la regla y las dos versiones divergen.
   - El esquema del formulario existe para avisar **antes** de la vuelta
     al servidor, no para sustituirla.

8. **EL ALIAS `@/` ES LA UNICA FORMA DE SUBIR DE CARPETA.** Prohibido
   `../../..`: mover un archivo obliga a arreglar rutas que no cambiaron.

9. **`unknown` EN LAS FRONTERAS.** Lo que llega de fuera —`catch`,
   `JSON.parse`, un evento— entra como `unknown` y se estrecha. Tiparlo de
   entrada es afirmar algo que nadie ha comprobado.
