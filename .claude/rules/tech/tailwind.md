# Tech Stack: Tailwind v4 + shadcn/ui

DIRECTIVA: el color y la tipografia salen de los tokens, nunca de un valor
suelto. Un `bg-slate-900` escrito a mano no cambia con el tema y deja texto
ilegible sobre el fondo contrario.

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- Design Tokens (una sola definicion por decision visual)
- WCAG 2.2 AA (contraste y foco)
- Mobile-first

**TABLA ANTI-VANILLA:**

| Prohibido                          | Usar                                   |
| ---------------------------------- | -------------------------------------- |
| `tailwind.config.js`               | `@theme` en `src/index.css` (v4)       |
| `bg-slate-900`, `text-gray-500`    | `bg-background`, `text-muted-foreground` |
| `dark:` en cada elemento           | tokens que ya cambian con `.dark`      |
| `#0b0f14` en un componente         | variable de `index.css`                |
| `class=` con condicional a mano    | `cn()` de `cn`                         |
| Variante nueva con `if`            | `cva` en el componente de `ui/`        |
| `w-[350px]` en un contenedor       | `max-w-*` y unidades relativas         |
| `h-screen`                         | `min-h-dvh`                            |
| `space-y-*` entre hermanos flex    | `flex flex-col gap-*`                  |
| `outline-none` sin foco alternativo| `focus-visible:*` visible              |
| Icono de otra libreria             | `lucide-react`                         |

**REGLAS:**

1. **LOS TOKENS SON LA UNICA PALETA.** Definidos en `:root` y redefinidos
   en `.dark` dentro de `src/index.css`. Un color que solo existe dentro de
   `.dark` no se aplica en claro, y ese es el fallo clasico de tema roto.

2. **EL SEMANTICO NO ES EL ACENTO.** `--success`, `--warning` y
   `--destructive` comunican estado; `--primary` es identidad. Usar el
   acento para decir "correcto" deja al usuario sin señal cuando algo va
   mal.

3. **EL ESTADO NUNCA SE COMUNICA SOLO CON COLOR.** Siempre color **mas**
   forma o texto: un icono, una etiqueta, un punto con su `sr-only`. Uno de
   cada doce hombres no distingue rojo de verde.

4. **`font-machine` PARA TODO DATO DE MAQUINA.** IP, puerto, slug, usuario
   SSH, huella del host, identificador. Es lo que separa de un vistazo lo
   que se teclea en una terminal de lo que se lee.

5. **`components/ui/` LO GENERA shadcn: NO SE REESCRIBE A MANO.** Se añade
   con `npx shadcn@latest add <componente>`. Si hace falta una variante,
   se amplia su `cva`; si hace falta otra cosa, se compone **encima**, en
   `components/`.

6. **UN SOLO ANCHO PARA TODO EL SISTEMA: `Container`.** Cabeceras, pies y
   contenido lo usan. Escribir `max-w-*` y `px-*` a mano en cada pantalla
   hace que los margenes salten al navegar y se lea como un corte.

   El borde inferior de una cabecera si va a sangre: la linea separa toda
   la pantalla, pero lo de dentro se alinea con el contenido de abajo.

   ```tsx
   <header className="border-b">
     <Container className="flex h-14 items-center">...</Container>
   </header>
   ```

7. **UN SOLO RADIO PARA LOS CONTENEDORES: `rounded-lg`.** Tablas,
   tarjetas, bloques de ajustes, paneles y vacios lo comparten. Dos radios
   conviviendo —una lista a `lg` y el bloque de al lado a `xl`— se lee como
   dos aplicaciones pegadas, y es lo que ya paso una vez. `rounded-md` es
   para controles —botones, chips, entradas—; `rounded-full` para avatares
   e insignias redondas. Fuera de eso no hay mas radios.

8. **LA COMPOSICION VA EN `components/`, NO EN `ui/`.** `EmptyState`,
   `ErrorState`, `PageHeader` y `BrandLockup` son piezas propias que usan
   las de `ui/`. Mezclarlas hace que el proximo `shadcn add` machaque
   codigo propio.

9. **MOBILE-FIRST.** Las clases sin prefijo son el movil; `sm:`, `lg:`
   añaden. Al reves obliga a deshacer en cada corte.

10. **UNA ZONA CLICABLE TENDIDA DEBAJO SE DECLARA CON EL CURSOR.** La de
   ampliar el carril usa `ew-resize`, y para ganarle a la regla global de
   la mano hace falta la misma especificidad o mas:
   `button[data-slot='ampliar-barra']:not(:disabled)`. Lo que va encima
   —enlaces y botones— recupera sus eventos con `pointer-events-auto`.

11. **EN MOVIL SE PELEA POR CADA FILA.** La accion primaria va al lado del
   titulo, no debajo, y se encoge a 36 px (`[data-slot='page-header']` en
   `index.css`); los selectores de la barra de filtros se reparten la fila
   en vez de apilarse. Cada fila de cabecera es una tarjeta menos a la
   vista, y la lista es a lo que se venia.

12. **NADA DE SCROLL HORIZONTAL EN EL CUERPO.** Tabla, bloque de codigo o
   diagrama ancho van dentro de su propio `overflow-x-auto`.

13. **`prefers-reduced-motion` SE RESPETA,** y esta resuelto de forma global
   en `index.css`. Una animacion nueva no lo puede saltar.

14. **EL ORDEN DE LAS CLASES NO ES DECORATIVO:** posicion, caja, tipografia,
   color, estados. Una lista larga y desordenada esconde la clase que se
   contradice con otra.

15. **EL ALTO DE LOS CONTROLES SE DECIDE UNA VEZ, EN `index.css`.** Input y
   selector miden 44 px; el boton, 40. Pedirlo a mano en cada formulario
   —`h-11!` en un dialogo y nada en el de al lado— deja columnas
   escalonadas y nadie sabe cual es el bueno. Quien necesite otro alto lo
   pide con el modificador `!` y por un motivo: la barra de filtros y el
   selector de tipo de un enlace, que van en fila con otra cosa.
