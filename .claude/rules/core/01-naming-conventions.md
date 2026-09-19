---
paths:
  - "**/*"
---

# 01. Expressive Naming & Architectural Standards

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**
Al generar o refactorizar código, aplica estrictamente estos principios universales:

- Clean Code (Robert C. Martin)
- CQS (Command Query Separation)
- Domain-Driven Design (DDD) - Ubiquitous Language
- DRY (Don't Repeat Yourself)

**REGLAS DE NOMENCLATURA:**

1. **BOOLEAN PREDICATES (Clean Code):**
   - Usar prefijos semánticos que formen preguntas de sí/no (`is`, `has`, `can`, `should`).
   - Prohibidos los nombres de estado ambiguos como `status`, `flag` o `state`.

2. **COMMAND QUERY SEPARATION (CQS):**
   - **Queries (Devuelven datos, no mutan):** Usar verbos de extracción precisos (`get`, `fetch`, `calculate`).
   - **Commands (Mutan estado, no devuelven datos):** Usar verbos de acción directos (`sync`, `update`, `dispatch`, `register`).
   - **Prohibido:** Verbos genéricos o "comodines" que no dicen nada exacto (`process`, `handle`, `manage`, `do`).

3. **UBIQUITOUS LANGUAGE (DDD):**
   - Los nombres deben reflejar el negocio real, no la tecnología subyacente.
   - Usar plurales naturales para colecciones (`users`, no `userList` o `userArray`).
   - Cero abreviaturas crípticas (prohibido usar `usr`, `idx`, `req`, `obj`).

4. **DRY CONTEXT (Don't Repeat Yourself):**
   - Evitar la redundancia contextual o "tartamudeo" en el código.
   - Si la entidad o módulo ya define el dominio (ej. clase `User`), sus métodos no deben repetirlo (usar `getProfile()`, NUNCA `getUserProfile()`).
