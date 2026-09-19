// Exporta la marca. De los SVG de public/marca salen sus PNG y WebP, el
// favicon y los iconos de móvil. Se corre tras `dibujar-marca.py`:
// `node scripts/exportar-marca.mjs`
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const publico = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const marca = path.join(publico, 'marca')
const FONDO = '#0b0f14'

const leer = (nombre) => readFileSync(path.join(marca, nombre), 'utf8')
const medidas = (svg) =>
  svg
    .match(/viewBox="0 0 (\d+) (\d+)"/)
    .slice(1, 3)
    .map(Number)

// En la pestaña, la pantalla de inicio y el avatar el símbolo va en caja
// oscura, o se pierde
const enCaja = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${FONDO}"/>
  <g transform="translate(5 8) scale(0.75)">
${leer('isotipo-oscuro.svg').match(/<path [^>]*\/>/)[0]}
  </g>
</svg>
`

const navegador = await chromium.launch()
const pagina = await navegador.newPage()
await pagina.setContent('<!doctype html><html><body></body></html>')

/** Pinta el SVG en un lienzo del navegador y devuelve el PNG o WebP. */
async function pintar(svg, ancho, alto, tipo) {
  const dato = await pagina.evaluate(
    async ({ svg, ancho, alto, tipo }) => {
      const imagen = new Image()
      imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svg.replace('<svg ', `<svg width="${ancho}" height="${alto}" `),
      )}`
      await imagen.decode()
      const lienzo = document.createElement('canvas')
      lienzo.width = ancho
      lienzo.height = alto
      lienzo.getContext('2d').drawImage(imagen, 0, 0, ancho, alto)
      return lienzo.toDataURL(`image/${tipo}`, 0.92)
    },
    { svg, ancho, alto, tipo },
  )
  return Buffer.from(dato.split(',')[1], 'base64')
}

async function exportar(carpeta, nombre, svg, ancho, alto, tipos) {
  for (const tipo of tipos) {
    writeFileSync(
      path.join(carpeta, `${nombre}.${tipo}`),
      await pintar(svg, ancho, alto, tipo),
    )
    console.log(
      `  ${path.relative(publico, carpeta) || '.'}/${nombre}.${tipo}  ${ancho}x${alto}`,
    )
  }
}

for (const nombre of [
  'imagotipo-oscuro',
  'imagotipo-claro',
  'imagotipo-una-tinta',
  'etiqueta-oscuro',
  'etiqueta-claro',
  'apilado-oscuro',
  'apilado-claro',
]) {
  const svg = leer(`${nombre}.svg`)
  const [ancho, alto] = medidas(svg)
  await exportar(marca, nombre, svg, ancho * 4, alto * 4, ['png', 'webp'])
}
await exportar(marca, 'isotipo-512', leer('isotipo-oscuro.svg'), 512, 512, ['png'])
await exportar(marca, 'avatar-512', enCaja, 512, 512, ['png'])

writeFileSync(path.join(publico, 'favicon.svg'), enCaja)
console.log('  favicon.svg')
await exportar(publico, 'apple-touch-icon', enCaja, 180, 180, ['png'])
await exportar(publico, 'icon-512', enCaja, 512, 512, ['png'])

await navegador.close()
