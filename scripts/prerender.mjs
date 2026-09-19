// Prepara la web compilada para un ambiente: config.js, HTML por página
// pública, sitemap, robots y el cascarón del panel (app.html). Corre al
// arrancar el contenedor, con su .env: la misma imagen sirve a todos.
//   node --env-file=.env scripts/prerender.mjs
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { JSDOM } from 'jsdom'

import { buildConfigScript, readConfiguracion } from './configuracion.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(raiz, 'dist')
const ssr = path.join(raiz, 'dist-ssr')

const configuracion = readConfiguracion(process.env)
const { sitioUrl } = configuracion
// Pruebas no debe salir en Google: ni sitemap ni permiso a los buscadores
const indexable = configuracion.ambiente === 'prd'
// Si la API publicada no se alcanza desde el servidor, otra dirección
const apiUrl = (process.env.PRERENDER_API_URL || configuracion.apiUrl).replace(/\/$/, '')
if (!sitioUrl) throw new Error('Falta APP_SITE_URL: las páginas la usan en sus enlaces.')
if (!apiUrl)
  throw new Error('Falta APP_API_URL o PRERENDER_API_URL: la API da contacto y precios.')

// index.html se reemplaza por la portada: la primera vez se guarda aparte
const PLANTILLA = path.join(ssr, 'plantilla.html')
if (!existsSync(PLANTILLA)) copyFileSync(path.join(dist, 'index.html'), PLANTILLA)
const plantilla = readFileSync(PLANTILLA, 'utf8')
const CABECERA = /<!--cabecera-->[\s\S]*?<!--\/cabecera-->/

// Algunos módulos del cliente usan window al importarse
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: sitioUrl })
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  __PILOTSSH__: { ambiente: configuracion.ambiente, apiUrl: configuracion.apiUrl },
})
dom.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
})

const INTENTOS = 30
const ESPERA_MS = 2000

/** Reintenta: al arrancar el servidor, la API puede tardar en responder. */
async function leer(ruta) {
  for (let intento = 1; ; intento++) {
    try {
      const respuesta = await fetch(`${apiUrl}/api${ruta}`)
      if (respuesta.ok) return respuesta.json()
      throw new Error(`respondió ${respuesta.status}`)
    } catch (error) {
      if (intento === INTENTOS) {
        throw new Error(
          `La API no responde en ${apiUrl}/api${ruta}: ${error.cause?.message ?? error.message}`,
        )
      }
      await new Promise((resolver) => setTimeout(resolver, ESPERA_MS))
    }
  }
}

const datos = { sitio: await leer('/site'), precios: await leer('/pricing') }
const { renderPage, buildHead, PAGINAS_PUBLICAS, LOGO } = await import(
  pathToFileURL(path.join(ssr, 'prerender.js')).href
)

writeFileSync(path.join(dist, 'config.js'), buildConfigScript(configuracion))

writeFileSync(
  path.join(dist, 'app.html'),
  plantilla.replace(
    CABECERA,
    '<title>Pilot SSH</title>\n    <meta name="robots" content="noindex" />',
  ),
)

for (const pagina of PAGINAS_PUBLICAS) {
  const cabecera = buildHead(pagina, datos, {
    sitioUrl,
    imagenUrl: `${sitioUrl}/og.png`,
    logoUrl: `${sitioUrl}${LOGO}`,
    indexable,
  })
  const contenido = await renderPage(pagina.ruta, datos, sitioUrl)
  writeFileSync(
    path.join(dist, pagina.archivo),
    plantilla.replace(CABECERA, cabecera).replace('<!--contenido-->', contenido),
  )
  console.log(`  ${pagina.ruta} → ${pagina.archivo}`)
}

if (indexable) {
  const hoy = new Date().toISOString().slice(0, 10)
  writeFileSync(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGINAS_PUBLICAS.map(
  ({ ruta, prioridad }) =>
    `  <url><loc>${sitioUrl}${ruta === '/' ? '/' : ruta}</loc><lastmod>${hoy}</lastmod><priority>${prioridad}</priority></url>`,
).join('\n')}
</urlset>
`,
  )
}
writeFileSync(
  path.join(dist, 'robots.txt'),
  indexable
    ? `User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /backoffice/\n\nSitemap: ${sitioUrl}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n',
)

dom.window.close()
console.log(
  indexable
    ? '  config.js, sitemap.xml, robots.txt, app.html'
    : '  config.js, robots.txt (sin indexar), app.html',
)
