---
paths:
  - "**/*"
---

# 06. Testing Standards (La Prueba es Parte del Cambio)

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- F.I.R.S.T. (Fast, Independent, Repeatable, Self-validating, Timely)
- Arrange-Act-Assert
- Regression-First (todo bug corregido nace con su prueba)
- Test Pyramid (muchas unitarias, pocas de integración, mínimas E2E)

**REGLAS DE PRUEBAS:**

1. **REGRESIÓN OBLIGATORIA:**
   - Corregir un bug **sin** escribir la prueba que lo fija es dejar el
     bug listo para volver.
   - La prueba se escribe de modo que **falle con el código viejo**. Una
     que pasa en ambos no prueba nada.
   - Su docstring nombra el incidente, no la implementación.

2. **LA PRUEBA NOMBRA EL COMPORTAMIENTO:**
   - `test_comparticion_caducada_no_da_acceso`, nunca `test_share_1`
     ni `test_get_queryset`.
   - Se lee como una frase del negocio. Si hace falta leer el cuerpo para
     saber qué garantiza, el nombre está mal.

3. **PROHIBIDO MAQUILLAR LA SUITE:**
   - Prohibido `skip`, `xfail` o comentar una prueba para que pase el
     conjunto. Una prueba roja es información, no un estorbo.
   - Prohibido relajar la aserción hasta que pase.

4. **INDEPENDENCIA (la I de F.I.R.S.T.):**
   - No dependen del orden de ejecución ni de datos sembrados por otra.
   - Cada prueba construye lo que necesita y no deja rastro.
   - Prohibido depender de la base de datos de desarrollo.

5. **UNA PRUEBA, UN COMPORTAMIENTO.**
   - Varias aserciones valen si describen el mismo hecho. Si la prueba
     necesita un `and` en su nombre, son dos pruebas.

6. **NO SE PRUEBA EL FRAMEWORK.**
   - Probar que el ORM guarda, o que el router enruta, es ruido.
   - Se prueba **la decisión propia**: reglas de negocio, permisos,
     cálculos, transiciones de estado y fronteras de error.

7. **LO EXTERNO SE SIMULA, LO PROPIO NO.**
   - Red, disco, reloj y servicios de terceros se sustituyen por dobles.
   - Simular la propia lógica para que pase la prueba invalida la prueba.

8. **LO QUE NO SE DEJA PROBAR ESTÁ MAL DISEÑADO.**
   - Si probar algo exige contorsiones, el problema es el acoplamiento,
     no la prueba. Se extrae la decisión a una función pura y se prueba
     esa.

9. **DEFINICIÓN DE TERMINADO:**
   - Un cambio está terminado cuando la suite pasa **entera**, no cuando
     pasa la prueba nueva.
   - El proyecto declara sus puertas de calidad en su `CLAUDE.md`; son de
     cumplimiento obligatorio antes de entregar.
