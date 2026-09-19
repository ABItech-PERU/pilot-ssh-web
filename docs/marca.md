# Marca

El símbolo es un solo trazo: el chevron del prompt que baja y sigue como cola.
En el imagotipo, la cola llega hasta la L de PILOT.

## Archivos

Los SVG de `public/marca/` son la única fuente. De ellos salen los PNG y WebP
de esa carpeta, `favicon.svg`, `apple-touch-icon.png` e `icon-512.png`.

| Uso                                                     | Archivo                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| Web, correos y documentos: la marca principal           | `imagotipo-*`                                         |
| Espacios estrechos (SSH pasa a un distintivo)           | `etiqueta-*`                                          |
| Publicaciones cuadradas y portadas                      | `apilado-*`                                           |
| Foto de perfil (el recorte circular respeta el símbolo) | `avatar-512.png`                                      |
| Pestaña y pantalla de inicio                            | `favicon.svg`, `apple-touch-icon.png`, `icon-512.png` |
| Para quien haga una pieza (diseñador, imprenta)         | `manual-de-marca.png`                                 |

Cada una en versión oscura y clara, más el imagotipo de una tinta. Una sola
marca principal en el producto: las variantes son para donde la principal no
cabe, no alternativas.

## Regenerar

En la carpeta `pilot-ssh-web/`, en la máquina (no en el contenedor):

```bash
python scripts/dibujar-marca.py          # solo si cambia el trazo o la palabra
node scripts/exportar-marca.mjs
node scripts/imagen-para-compartir.mjs   # og.png, la vista previa al compartir
node scripts/manual-de-marca.mjs         # el manual de marca
```

`dibujar-marca.py` pide `fonttools`, `brotli` y `uharfbuzz`, y descarga Inter 800.

## Dónde se usa

- **Correos:** cargan `marca/imagotipo-oscuro.png` desde `APP_WEB_URL`.
  Outlook y Gmail no muestran SVG ni WebP.
- **Web y panel:** el SVG del imagotipo tal cual; `BrandMark` copia el trazo
  del isotipo.
- **Capturas del panel en el sitio** (`src/assets/panel-*.webp`): son reales,
  con los datos de `seed_demo`, en oscuro, a 1280 px y escala 2, en WebP de
  calidad 82. Al cambiar el diseño del panel, vuelva a tomarlas.
