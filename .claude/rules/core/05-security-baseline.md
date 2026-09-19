---
paths:
  - "**/*"
---

# 05. Security Baseline (Universal)

**REGLAS DE SEGURIDAD:**

1. **SECRETOS:**
   - Prohibido credenciales, tokens o API keys en código, commits,
     ejemplos o documentación; SIEMPRE variables de entorno.
   - Prohibido loguear secretos o PII sensible (contraseñas, tokens,
     datos biométricos).

2. **ENTRADAS Y SALIDAS:**
   - Toda entrada externa se valida server-side; el frontend solo asiste.
   - Queries parametrizadas SIEMPRE; prohibido concatenar input en
     SQL o comandos de shell.
   - Render crudo (`v-html`, `{!! !!}`) prohibido con datos de usuario.

3. **AUTORIZACIÓN:**
   - Toda ruta/acción nueva verifica permiso explícito en el servidor;
     ocultar UI no es control de acceso.
   - IDs de recursos validados contra el contexto del usuario/tenant
     (anti-IDOR).

4. **DEPENDENCIAS:**
   - No agregar paquetes sin necesidad real ni abandonados; revisar
     advisories al incorporar uno nuevo.
