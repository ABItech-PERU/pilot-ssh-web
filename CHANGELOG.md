# Changelog

Cambios notables de Pilot SSH Web, según Keep a Changelog 1.1 y SemVer 2.0.

## [Sin publicar]

### Añadido

- Sitio público con inicio, precios, seguridad y páginas legales, prerenderizado.
- Panel de cada organización con sus servidores, credenciales, equipo, accesos, auditoría y créditos.
- Terminal SSH en el navegador que se reconecta cuando la API se actualiza.
- Panel «Archivos» junto a la terminal para explorar, descargar, renombrar, borrar y subir archivos del servidor.
- En el panel de archivos, editor de texto, permisos, carpetas comprimidas, elegir varios, orden, ocultos e ir a una ruta.
- «Extraer aquí» para abrir en el servidor un `.tar.gz`, `.tgz`, `.tar` o `.zip`.
- Recargas de créditos con Mercado Pago.
- Panel de plataforma para soporte, finanzas y operaciones.
- Despliegue continuo a `uat` y publicación en `prod` con etiqueta `vX.Y.Z`.

### Cambiado

- Subir un archivo desde la terminal va unas veinte veces más rápido, hasta 5 GB.
- Panel de subidas con cola, velocidad, tiempo restante, cancelar y reintentar por archivo.
- Si la red se corta a media subida, al volver sigue desde lo que ya llegó.
- Si el archivo ya existe, se elige entre reemplazar, conservar ambos u omitir, también para todos.
- Subir una carpeta entera, soltándola o con «Subir › Una carpeta entera», y bajar varios elegidos en un solo `.tar.gz`.
- Las carpetas se comprimen en el servidor con «Comprimir» y se bajan como `.tar.gz` con avance real; «Descargar comprimida» desaparece.
- Borrar una carpeta con contenido la mide antes y, con más de 100 archivos, pide escribir su nombre.
- En una laptop o más ancho, el panel de archivos va al lado de la terminal y la estrecha; su ancho se arrastra, se recuerda y vuelve al inicial con doble clic.
- El panel lateral tiene pestañas, listo para sumar herramientas junto a «Archivos».
- Los nombres largos se leen en la letra de la interfaz y se recortan por el medio, sin perder la extensión.
- «Detalles» de un archivo o carpeta, con tamaño exacto, propietario, grupo, permisos explicados y a dónde apunta un enlace.
- Las descargas de la terminal las baja el gestor de descargas del navegador, directo al disco, sin tope de memoria.
- Arrastrar un archivo sobre la terminal dice a qué carpeta irá, y los avisos de la terminal salen en el centro de la cabecera, sin tapar la shell ni el panel de archivos.

### Eliminado

- El botón «Subir» de la barra de la terminal: se sube desde el panel de archivos o arrastrando.

### Seguridad

- La sesión ya no se guarda en `localStorage`: el `access` vive en memoria y el `refresh` en una cookie `httpOnly`.
- La terminal se abre con un vale de un solo uso en lugar del `access` en la URL.
