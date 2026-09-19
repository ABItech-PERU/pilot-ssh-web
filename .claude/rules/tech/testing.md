# Tech Stack: Pruebas (Vitest + Testing Library)

DIRECTIVA: aplica `core/06-testing-standards.md`. Esto solo añade lo que cambia
por el stack.

**TABLA ANTI-VANILLA:**

| Prohibido                                  | Usar                                |
| ------------------------------------------ | ----------------------------------- |
| `container.querySelector('.boton')`        | `getByRole('button', { name })`     |
| `getByTestId` como primera opcion          | rol, etiqueta o texto               |
| `fireEvent.change`                         | `userEvent.type`                    |
| Llamar a la API real                       | doble de `lib/http`                 |
| `await new Promise(r => setTimeout(r, 50))`| `findBy*` / `waitFor`               |
| Probar el estado interno de un hook        | lo que ve el usuario                |
| `expect(x).toBeTruthy()` sobre un elemento | `toBeInTheDocument()`               |
| Modulo con cache sin `vi.resetModules()`   | recargarlo en cada prueba           |

**REGLAS:**

1. **SE PRUEBA LO QUE VE EL USUARIO.** Consultas por rol y por texto
   accesible. Si una prueba no encuentra el boton por su nombre, el
   problema suele ser que al boton le falta nombre accesible: la prueba
   acaba de encontrar un fallo real.

2. **LO QUE SE PRUEBA AQUI ES LA DECISION PROPIA,** no el framework:
   - la normalizacion de errores (`toApiError`);
   - el reparto de errores sobre el formulario (`applyFieldErrors`);
   - la eleccion de organizacion actual;
   - la persistencia y limpieza de la sesion;
   - los guards de ruta.

   Probar que React pinta un `<div>` o que Axios hace un GET es ruido.

3. **LO QUE NO SE DEJA PROBAR ESTA MAL DISEÑADO.** Si probar una decision
   exige montar media aplicacion, la decision se extrae a una funcion pura
   y se prueba esa. `resolveOrganization` salio de esta regla.

4. **LOS MODULOS CON CACHE SE RECARGAN.** `token-store` y la organizacion
   actual cachean en memoria a proposito. Sin `vi.resetModules()` una
   prueba ve la sesion de la anterior y falla sin motivo aparente.

5. **CADA PRUEBA LIMPIA SU ALMACENAMIENTO.** Esta en `tests/setup.ts` para
   todas. Una prueba que escribe en `localStorage` y no limpia condiciona
   el arranque de la siguiente.

6. **LA RED SE SIMULA, LA LOGICA PROPIA NO.** Se dobla `lib/http`; nunca se
   dobla la funcion que se esta probando.

7. **LA PRUEBA VIVE JUNTO A LO QUE PRUEBA.** `lib/api-error.test.ts` al
   lado de `lib/api-error.ts`. Una carpeta `__tests__` lejana se
   desincroniza al mover el archivo.

8. **LOS ESTADOS DE CARGA Y VACIO TAMBIEN SE PRUEBAN.** Son los que mas se
   rompen al refactorizar, porque nadie los mira a mano: el desarrollador
   siempre tiene datos.

9. **DEFINICION DE TERMINADO:** las dos puertas del `CLAUDE.md` pasan.
   `npm run typecheck` y `npm test`. Prohibido `it.skip` para que pase el
   conjunto.
