# Changelog

Cambios notables de Pilot SSH Web, según Keep a Changelog 1.1 y SemVer 2.0.

## [Sin publicar]

### Añadido

- Sitio público con inicio, precios, seguridad y páginas legales, prerenderizado.
- Panel de cada organización con sus servidores, credenciales, equipo, accesos, auditoría y créditos.
- Terminal SSH en el navegador que se reconecta cuando la API se actualiza.
- Panel «Archivos» junto a la terminal para explorar, descargar, renombrar, borrar y subir archivos del servidor.
- En el panel de archivos, editor de texto, permisos, carpetas comprimidas, elegir varios, orden, ocultos e ir a una ruta.
- Recargas de créditos con Mercado Pago.
- Panel de plataforma para soporte, finanzas y operaciones.
- Despliegue continuo a `uat` y publicación en `prod` con etiqueta `vX.Y.Z`.

### Cambiado

- Las descargas de la terminal las baja el gestor de descargas del navegador, directo al disco, sin tope de memoria.
- Arrastrar un archivo sobre la terminal dice a qué carpeta irá, y los avisos de la terminal salen arriba a la izquierda, sin tapar el panel de archivos.

### Eliminado

- El botón «Subir» de la barra de la terminal: se sube desde el panel de archivos o arrastrando.

### Seguridad

- La sesión ya no se guarda en `localStorage`: el `access` vive en memoria y el `refresh` en una cookie `httpOnly`.
- La terminal se abre con un vale de un solo uso en lugar del `access` en la URL.
