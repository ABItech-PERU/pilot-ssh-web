"""Dibuja los SVG de public/marca: el símbolo (un solo trazo: chevron y cola)
y la palabra PILOT SSH ya en trazados, para que nada dependa de la fuente.

Se corre al cambiar el trazo o la palabra; despues, exportar-marca.mjs.
Pide `pip install fonttools brotli uharfbuzz`; descarga Inter 800 de
Google Fonts.
"""
import io
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

DESTINO = Path(__file__).resolve().parent.parent / 'public' / 'marca'

TEAL, TEAL_HONDO = '#14b8a6', '#0f766e'   # sobre oscuro, sobre claro
TINTA, BLANCO, FONDO = '#0f172a', '#ffffff', '#0b0f14'

ALTO = 64
GROSOR = 10
CHEVRON = 'M14 10 40 31 14 52'
COLA = 58            # hasta dónde llega la cola en el símbolo solo
CAPITULAR = 24       # altura de las mayúsculas
LINEA_BASE = 41      # deja sitio a la cola (y=52) bajo la palabra
INICIO_TEXTO = 64
ESPACIADO = 0.02     # em, el mismo que la web


def descargar_inter():
    """Inter 800, subconjunto latino: el mismo archivo que carga la web."""
    cache = Path(tempfile.gettempdir()) / 'inter-800.woff2'
    if cache.exists():
        return cache
    # Con un navegador moderno Google responde en woff2 y por subconjuntos
    peticion = urllib.request.Request(
        'https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap',
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36'},
    )
    css = urllib.request.urlopen(peticion, timeout=30).read().decode()
    latino = css.split('/* latin */', 1)[-1]
    url = re.search(r'url\((https://[^)]+\.woff2)\)', latino).group(1)
    cache.write_bytes(urllib.request.urlopen(url, timeout=30).read())
    return cache


def redondear(comandos):
    return re.sub(r'-?\d+\.\d+', lambda n: f'{float(n.group()):.2f}'.rstrip('0').rstrip('.'), comandos)


# --- la palabra, glifo a glifo ------------------------------------------
fuente = TTFont(descargar_inter())
fuente.flavor = None                     # woff2 → sfnt para HarfBuzz
crudo = io.BytesIO()
fuente.save(crudo)
upm = fuente['head'].unitsPerEm
escala = CAPITULAR / fuente['OS/2'].sCapHeight
glifos = fuente.getGlyphSet()
nombres = fuente.getGlyphOrder()

cara = hb.Font(hb.Face(crudo.getvalue()))
cara.scale = (upm, upm)
memoria = hb.Buffer()
memoria.add_str('PILOT SSH')
memoria.guess_segment_properties()
hb.shape(cara, memoria, {'kern': True, 'liga': True})

trazos = {'PILOT': [], 'SSH': []}
limites = {}                             # caja de cada parte y de la L
avance = 0
for info, pos in zip(memoria.glyph_infos, memoria.glyph_positions):
    parte = 'PILOT' if info.cluster < 6 else 'SSH'
    x = INICIO_TEXTO + (avance + pos.x_offset) * escala
    y = LINEA_BASE - pos.y_offset * escala
    transformacion = (escala, 0, 0, -escala, x, y)
    pluma = SVGPathPen(glifos)
    glifos[nombres[info.codepoint]].draw(TransformPen(pluma, transformacion))
    caja = BoundsPen(glifos)
    glifos[nombres[info.codepoint]].draw(TransformPen(caja, transformacion))
    if pluma.getCommands():
        trazos[parte].append(redondear(pluma.getCommands()))
        x0, y0, x1, y1 = caja.bounds
        previo = limites.get(parte, (x0, y0, x1, y1))
        limites[parte] = (min(previo[0], x0), min(previo[1], y0), max(previo[2], x1), max(previo[3], y1))
        if info.cluster == 2:
            limites['L'] = caja.bounds
    avance += pos.x_advance + ESPACIADO * upm

FIN_L = round(limites['L'][2], 2)
ANCHO_TEXTO = limites['SSH'][2] - limites['PILOT'][0]
ANCHO = round(limites['SSH'][2] + 6)


# --- piezas ---------------------------------------------------------------
def simbolo(color, cola=COLA, transformar=''):
    return (f'  <path d="{CHEVRON}H{cola}" fill="none" stroke="{color}" stroke-width="{GROSOR}"'
            f' stroke-linejoin="round" stroke-linecap="round"{transformar}/>\n')


def palabra(color_pilot, color_ssh, transformar=''):
    return (f'  <path fill="{color_pilot}"{transformar} d="{" ".join(trazos["PILOT"])}"/>\n'
            f'  <path fill="{color_ssh}"{transformar} d="{" ".join(trazos["SSH"])}"/>\n')


def etiqueta(color_pilot):
    """PILOT y, tras él, SSH pequeño dentro de un distintivo teal."""
    px0, _, px1, _ = limites['PILOT']
    sx0, sy0, sx1, _ = limites['SSH']
    factor = 11 / CAPITULAR
    x = px1 + 10
    ancho = (sx1 - sx0) * factor + 14
    alto_texto = LINEA_BASE - CAPITULAR
    tx = x + 7 - sx0 * factor
    ty = alto_texto + (CAPITULAR - 11) / 2 - sy0 * factor
    return (f'  <path fill="{color_pilot}" d="{" ".join(trazos["PILOT"])}"/>\n'
            f'  <rect x="{x:.2f}" y="{alto_texto}" width="{ancho:.2f}" height="{CAPITULAR}" rx="4" fill="{TEAL}"/>\n'
            f'  <path fill="{FONDO}" transform="translate({tx:.2f} {ty:.2f}) scale({factor:.4f})" d="{" ".join(trazos["SSH"])}"/>\n',
            round(x + ancho + 6))


def apilado(color_simbolo, color_pilot, color_ssh):
    """Símbolo arriba y palabra centrada debajo, para usos cuadrados."""
    zoom = 1.5
    ancho = round(ANCHO_TEXTO + 24)
    dx = (ancho - 54 * zoom) / 2 - 9 * zoom           # símbolo en x 9..63
    base = 4 + 57 * zoom + 16 + CAPITULAR
    mover = f' transform="translate({(ancho - ANCHO_TEXTO) / 2 - limites["PILOT"][0]:.2f} {base - LINEA_BASE:.2f})"'
    cuerpo = (simbolo(color_simbolo, transformar=f' transform="translate({dx:.2f} 4) scale({zoom})"')
              + palabra(color_pilot, color_ssh, mover))
    return cuerpo, ancho, round(base + 8)


def svg(nombre, ancho, contenido, alto=ALTO):
    cuerpo = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" role="img" aria-label="Pilot SSH">\n'
              f'  <title>Pilot SSH</title>\n{contenido}</svg>\n')
    (DESTINO / nombre).write_text(cuerpo, encoding='utf-8', newline='\n')
    print(f'  marca/{nombre}  {ancho}x{alto}')


DESTINO.mkdir(exist_ok=True)
for tono, color, texto, acento in (('oscuro', TEAL, BLANCO, TEAL), ('claro', TEAL_HONDO, TINTA, TEAL_HONDO)):
    svg(f'isotipo-{tono}.svg', ALTO, simbolo(color))
    svg(f'logotipo-{tono}.svg', ANCHO - INICIO_TEXTO + 6, palabra(texto, acento, f' transform="translate({6 - INICIO_TEXTO} 0)"'))
    svg(f'imagotipo-{tono}.svg', ANCHO, simbolo(color, FIN_L) + palabra(texto, acento))
    cuerpo, ancho = etiqueta(texto)
    svg(f'etiqueta-{tono}.svg', ancho, simbolo(color, FIN_L) + cuerpo)
    cuerpo, ancho, alto = apilado(color, texto, acento)
    svg(f'apilado-{tono}.svg', ancho, cuerpo, alto)
svg('imagotipo-una-tinta.svg', ANCHO, simbolo(TINTA, FIN_L) + palabra(TINTA, TINTA))
print(f'la cola llega a x={FIN_L}, el final de la L', file=sys.stderr)
