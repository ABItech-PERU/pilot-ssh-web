---
paths:
  - "**/*"
---

# 03. Git Commit Standards (Historial Limpio y Atómico)

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- Conventional Commits 1.0.0
- Atomic Commits (Un commit = Un cambio lógico)
- Imperative Mood (Modo Imperativo en el asunto)

**REGLAS DE GENERACIÓN DE COMMITS:**

1. **FORMATO ESTRICTO (Conventional Commits):**
   - Estructura obligatoria: `<type>(<scope>): <subject>`
   - Prohibido cualquier trailer de coautoría de IA
     (`Co-Authored-By: Claude...`): el autor es el usuario.
   - **Tipos permitidos:**
     - `feat`: Nueva característica.
     - `fix`: Corrección de un bug.
     - `refactor`: Cambio de código que no corrige un bug ni añade una feature.
     - `chore`: Tareas de mantenimiento, dependencias o configuración.
     - `docs`: Cambios en la documentación.
     - `perf`: Mejoras de rendimiento.
     - `test`: Añadir o corregir pruebas.

2. **IDIOMA (Español Obligatorio):**
   - Asunto y cuerpo del commit SIEMPRE en español.
   - Ej: `feat(customers): agregar filtro por etiqueta`.
   - Excepción única: que el CLAUDE.md del proyecto exija otro idioma.

3. **IMPERATIVE MOOD (Modo Imperativo):**
   - El asunto (`subject`) debe leerse como una orden directa al código base.
   - Usar verbos en infinitivo/imperativo: `agregar`, `corregir`, `actualizar`, `eliminar`, `refactorizar`.
   - Prohibido usar pasado o gerundio (`agregado`, `corrigiendo`, `actualizando`).

4. **THE "WHY" BODY (Cuerpo del Commit):**
   - El asunto explica el "Qué". Si el cambio es complejo (siguiendo la Ley del Por Qué de `02-comment-standards.md`), el cuerpo del commit debe explicar el "Por qué" y el contexto del negocio.
   - Omitir el "Cómo", ya que el _diff_ del código ya lo demuestra.

5. **LÍMITES DE LONGITUD (Line Length Limit):**
   - Asunto (`subject`): Máximo 50 caracteres. NO debe terminar en punto.
   - Cuerpo (`body`): Solo si es necesario - Separado del asunto por una línea en blanco. Máximo 72 caracteres por línea (usar saltos de línea).

6. **OUTPUT SILENCIOSO (Directo a Consola):**
   - Cuando se te pida generar un mensaje de commit, devuelve ÚNICAMENTE el bloque de código Bash con el comando exacto (ej. `git commit -m "feat(auth): agregar login..."`).
   - Cero texto explicativo antes o después del bloque de código.
