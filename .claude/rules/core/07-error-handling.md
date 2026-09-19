---
paths:
  - "**/*"
---

# 07. Error Handling & Observability (El Fallo se Ve o no Existe)

**ESTÁNDARES BASE A INVOCAR (Industry Anchors):**

- Fail Fast (configuración y programación: reventar temprano y ruidoso)
- Fail Closed (seguridad y dinero: ante la duda, denegar)
- Don't Swallow Exceptions
- Errors are part of the contract

**REGLAS DE ERRORES:**

1. **PROHIBIDO TRAGAR EXCEPCIONES:**
   - Prohibido capturar sin actuar (`except: pass`, `catch {}`).
   - Si se decide ignorar un fallo, el bloque lleva **comentario del
     porqué**. Sin ese comentario es un descuido, no una decisión.

2. **CAPTURAR EL TIPO CONCRETO:**
   - Prohibido capturar la excepción genérica salvo en una **frontera**
     (petición HTTP, tarea en cola, bucle de conexión), donde se registra
     y se traduce.
   - Dentro del dominio se captura lo que se sabe manejar; lo demás sube.

3. **FAIL FAST EN ARRANQUE, FAIL CLOSED EN ACCESO:**
   - Configuración ausente o inválida: reventar al arrancar, nunca seguir
     con un valor de conveniencia.
   - Duda en un permiso, un saldo o una firma: **denegar**. El camino de
     error jamás concede más que el camino feliz.

4. **EL MENSAJE ES PARA QUIEN LO LEE:**
   - Dice qué pasó y qué hacer. Sin disculpas ni vaguedades.
   - Al usuario, en su idioma y sin interioridades. Al log, con el detalle
     técnico completo.
   - Prohibido devolver el `str(excepción)` crudo a una interfaz pública:
     filtra rutas, motores y estructura interna.

5. **NUNCA SE FILTRA EL INTERIOR EN PRODUCCIÓN:**
   - Trazas, consultas y variables de entorno no salen al cliente.
   - El modo depuración es de desarrollo; asumir que estará apagado no
     basta, el código no debe depender de ello.

6. **OBSERVABILIDAD:**
   - Prohibido `print`, `echo`, `console.log` como diagnóstico
     permanente: se usa el logger del stack.
   - Niveles con significado: `debug` para desarrollo, `info` para hechos
     del negocio, `warning` para lo recuperable, `error` para lo que
     rompe una operación.
   - **Prohibido loguear secretos** (`05-security-baseline.md` §1). Un
     volcado del objeto entero filtra el campo cifrado.
   - Lo que la auditoría deba conservar va a la auditoría, no al log: los
     logs rotan.

7. **EL FALLO SILENCIOSO ES EL PEOR:**
   - Un `null` devuelto donde se esperaba un dato, un bucle que no
     termina o una cola que deja de consumir no producen error visible y
     se descubren tarde.
   - Todo bucle de lectura declara su condición de salida.
   - Toda operación que pueda no aplicarse informa de que no se aplicó.

8. **IDEMPOTENCIA EN LO QUE SE REINTENTA:**
   - Lo que cobra, envía o borra y puede ejecutarse dos veces necesita
     clave de unicidad o comprobación previa. El reintento es la norma,
     no la excepción.
