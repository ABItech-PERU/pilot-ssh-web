# Tech Stack: React (Frontend Core)

DIRECTIVA: el componente pinta; no decide reglas de negocio ni guarda estado
que ya vive en el servidor. React 19: `use`, `useSyncExternalStore` y acciones
sustituyen a patrones que antes exigian librerias.

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- Rules of Hooks (orden estable, sin llamadas condicionales)
- Colocation (el codigo vive junto a lo que lo usa)
- Single Source of Truth (un dato, un dueño)
- Composition over configuration

**TABLA ANTI-VANILLA:**

| Prohibido                                  | Usar                                   |
| ------------------------------------------ | -------------------------------------- |
| `useEffect` para traer datos               | `useQuery`                             |
| `useState` con datos del servidor          | cache de React Query                   |
| `useEffect` que solo deriva un valor       | calcularlo en el render                |
| `useContext`                               | `use(Context)` de React 19             |
| `<Context.Provider value>`                 | `<Context value>`                      |
| Suscribirse a algo externo con `useEffect` | `useSyncExternalStore`                 |
| `window.location.href = ...`               | `useNavigate()` / `<Link>`             |
| `<a href>` a ruta interna                  | `<Link>` / `<NavLink>`                 |
| `index` como `key` en lista mutable        | el id del dominio                      |
| `React.FC<Props>`                          | `function Componente({ ... }: Props)`  |
| `any` en un handler                        | el tipo del evento                     |
| `style={{ ... }}` para lo estatico         | clases de Tailwind                     |
| `console.log` de diagnostico               | quitarlo antes de entregar             |
| Fecha formateada a mano                    | `lib/format.ts`                        |

**REGLAS:**

1. **EL SERVIDOR ES EL DUEÑO DE SUS DATOS.** Nada que venga de la API se
   copia a `useState`. La copia se desincroniza en cuanto otra pantalla
   invalida la consulta, y el usuario ve dos verdades distintas.
   - `useState` es para lo que solo existe en la pantalla: un dialogo
     abierto, un filtro sin confirmar, un paso del asistente.

2. **UN EFECTO ES UNA SINCRONIZACIÓN CON ALGO DE FUERA.** Suscribirse al
   `localStorage`, a un `matchMedia`, a un WebSocket o a un evento del
   `window`. Si el efecto solo calcula a partir de props o estado, sobra:
   ese calculo va en el cuerpo del componente.
   - Todo efecto que suscribe **devuelve su limpieza**. Sin ella el
     listener se acumula en cada montaje.

3. **LOS COMPONENTES SE NOMBRAN POR LO QUE SON, NO POR LO QUE HACEN.**
   `ServerFormDialog`, `OrganizationSwitcher`, `EmptyState`. Un componente
   llamado `Handler`, `Wrapper` o `Manager` no dice nada.
   - Archivo en `PascalCase.tsx` cuando exporta un componente; en
     `kebab-case.ts` cuando exporta funciones o tipos.

4. **UN COMPONENTE, UNA RESPONSABILIDAD.** Si el archivo pinta la pantalla
   **y** define su formulario **y** hace la mutacion, son tres piezas.
   La fila de una tabla se extrae en cuanto tiene condicionales propios.

5. **CUATRO ESTADOS, SIEMPRE.** Toda pantalla que pida datos resuelve los
   cuatro, y ninguno se deja para despues:

   | Estado | Que se pinta |
   |---|---|
   | Cargando | Esqueleto con la forma del contenido, no un spinner suelto |
   | Error | `ErrorState`, con reintento si el fallo lo admite |
   | Vacio | `EmptyState`, con la accion que lo resuelve |
   | Con datos | El contenido |

   Un esqueleto que no imita la forma final provoca un salto de layout al
   llegar los datos, y el usuario pierde donde estaba mirando.

6. **EL GUARD DE RUTA ES COMODIDAD, NO SEGURIDAD.** Esconder una ruta no
   protege nada: quien decide es el backend en cada peticion. Un permiso
   comprobado solo en el cliente es un permiso ausente.

7. **ACCESIBILIDAD DESDE EL PRIMER RENDER,** no como repaso final:
   - Todo control sin texto visible lleva `aria-label`.
   - Todo campo lleva su `<Label htmlFor>`; el error se enlaza y el campo
     se marca `aria-invalid`.
   - Lo que se pinta al fallar una accion es anunciable: `role="status"` o
     `aria-live` donde el cambio no lo provoca el propio usuario.
   - El foco visible no se elimina nunca; se rediseña si molesta.

8. **CARGA DIFERIDA POR RUTA.** El area privada, la terminal y cualquier
   dependencia pesada entran por `lazy` en el router. Quien solo abre la
   landing no descarga el panel.

9. **PROHIBIDO EL ESTADO GLOBAL DE CONVENIENCIA.** No hay Redux ni store
   global. Lo que hace falta compartir:
   - datos del servidor → React Query;
   - sesion y organizacion actual → su store con `useSyncExternalStore`;
   - lo demas → props, o contexto acotado a su rama.

10. **LAS LISTAS LLEVAN EL ID DEL DOMINIO COMO `key`.** Con el indice,
   borrar una fila reutiliza el estado interno de la siguiente y el
   usuario ve datos de otra fila en un campo abierto.
