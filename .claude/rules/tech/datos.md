# Tech Stack: React Query + Axios

DIRECTIVA: una peticion se hace en un `api.ts` de su feature, se consume con
React Query y todo fallo llega a la pantalla como `ApiError`. Ninguna de las
tres cosas se salta.

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- Server State vs Client State (Kent C. Dodds / TanStack)
- Errors are part of the contract
- Fail Closed (ante la duda, no se pinta el dato)

**TABLA ANTI-VANILLA:**

| Prohibido                             | Usar                                 |
| ------------------------------------- | ------------------------------------ |
| `fetch()` suelto en un componente     | `http` de `lib/http.ts`              |
| `axios.get()` con URL absoluta        | `http` con ruta relativa             |
| `useEffect` + `useState` para cargar  | `useQuery`                           |
| `queryKey: ['servers']` a mano        | `clavesServidor.*` del feature       |
| `error.response.data.message`         | `toApiError(error).message`          |
| `try/catch` en el componente          | `onError` de la mutacion             |
| `refetch()` tras una mutacion         | `invalidateQueries`                  |
| Guardar la respuesta en `useState`    | leerla de la cache                   |
| Ruta con barra final                  | sin barra: `/servers`                |
| `alert()` para avisar                 | `toast` de sonner                    |

**REGLAS:**

1. **UNA FEATURE, UN `api.ts`.** Todas las llamadas de un dominio viven
   juntas, tipadas, con sus claves de consulta al lado. Un componente que
   llama a `http` directamente esconde una peticion donde nadie la busca.

2. **LAS CLAVES DE CONSULTA SON UN OBJETO, NO CADENAS SUELTAS.**

   ```ts
   export const clavesServidor = {
     todos: (organizationSlug: string | null) => ['servers', organizationSlug] as const,
     detalle: (id: number) => ['servers', 'detalle', id] as const,
   }
   ```

   Escritas a mano en dos sitios, invalidar una deja la otra obsoleta y la
   pantalla enseña datos viejos sin ningun sintoma.

3. **LA ORGANIZACIÓN FORMA PARTE DE LA CLAVE.** Todo dato de dominio
   pertenece a una organizacion. Sin ella en la clave, cambiar de
   organizacion enseña los servidores de la anterior.

4. **TRAS MUTAR, SE INVALIDA.** `invalidateQueries` con la clave afectada.
   Llamar a `refetch()` a mano solo actualiza la pantalla que lo pide y
   deja al resto con la version vieja.

5. **UN SOLO SOBRE DE ERROR,** el que impone el backend:

   ```json
   { "message": "...", "code": "validacion_fallida", "errors": { "port": ["..."] } }
   ```

   - `message` se muestra tal cual: ya viene escrito para el usuario y **no
     se reescribe** en el cliente.
   - `code` es para el programa: ramificar, decidir si se reintenta.
   - `errors` va a los campos del formulario.

6. **`toApiError` ES LA UNICA PUERTA.** Convierte cualquier fallo —incluido
   el backend caido, que no trae sobre— en un `ApiError`. Leer
   `error.response.data` a mano revienta justo cuando no hay respuesta.

7. **NO SE REINTENTA LO QUE NO CAMBIA AL REINTENTAR.** Un `403`, un `404` o
   una validacion dan el mismo resultado tres veces y solo retrasan el
   aviso. Reintentar es para red caida y `5xx`.

8. **EL REFRESCO DEL TOKEN ES UNICO Y ESTA EN EL INTERCEPTOR.** Diez
   peticiones que caducan a la vez comparten un solo refresco: con la
   rotacion activada, diez refrescos invalidan nueve sesiones y echan al
   usuario.
   - Una peticion ya reintentada no se reintenta otra vez. Sin ese corte,
     un `401` permanente es un bucle infinito.

9. **EL AVISO DE ÉXITO ES `toast`; EL DE FALLO DEPENDE:**
   - fallo de un formulario → dentro del formulario, junto a los campos;
   - fallo de una accion suelta (borrar una fila) → `toast`;
   - fallo al cargar la pantalla → `ErrorState`, no un `toast` que se va.

10. **`staleTime` SE ELIGE POR DATO.** El saldo de creditos y la lista de
   servidores no envejecen igual. El valor por defecto son 30 segundos;
   subirlo o bajarlo es una decision, no un descuido.
