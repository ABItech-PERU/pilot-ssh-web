---
paths:
  - "**/*"
---

# 02. Comment Standards (Minimalismo Pragmático)

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- The Pragmatic Programmer (Document the Why, not the How)
- Clean Code (Los comentarios compensan nuestra incapacidad para expresarnos en el código)

**REGLAS DE DOCUMENTACIÓN:**

1. **THE "WHY" LAW (Ley del Por Qué):**
   - El código explica el "Qué" y el "Cómo" (apoyado en el archivo `01-naming-conventions.md`).
   - Los comentarios están reservados EXCLUSIVAMENTE para el "Por qué": reglas de negocio complejas, contexto de arquitectura, edge cases o parches/hacks inevitables.

2. **ZERO REDUNDANCY (Cero Redundancia):**
   - El comentario NUNCA repite lo que ya dice la sintaxis.
   - Si una variable indica su tipo nativamente (ej. `Boolean`, `Array`) o por su nombre, está estrictamente prohibido usar palabras redundantes en el comentario ("lista", "arreglo", "usuario", "boolean", "true" o "false").

3. **TELEGRAPHIC STYLE (Estilo Telegráfico):**
   - Aplicar la máxima densidad de información.
   - Eliminar artículos (el, la, un) y conectores innecesarios. Ir directo al estado o regla del negocio.
   - Ej: `// Post-préstamo: edición de tarjetas bloqueada`.

4. **LINE LENGTH LIMIT (Límite de Longitud):**
   - Ninguna línea de comentario debe superar los 80 caracteres.
   - Si requiere más contexto, dividir obligatoriamente en varias líneas mediante saltos de línea para evitar el scroll horizontal.

5. **MODERN DOCBLOCKS (Tipado Nativo):**
   - Aprovechar el tipado nativo del lenguaje (PHP 8+, TypeScript, etc.).
   - Omitir etiquetas repetitivas (`@param`, `@return`) si el tipo ya es explícito en la firma del método.
   - Usar DocBlocks ÚNICAMENTE para tipados complejos (ej. `@return array<int, UserDTO>`) o contratos de interfaces genéricas.

6. **SILENT EXECUTION (Ejecución Silenciosa):**
   - Si una línea o método es completamente evidente por sí misma gracias a un nombrado expresivo, NO lleva ningún tipo de comentario.
