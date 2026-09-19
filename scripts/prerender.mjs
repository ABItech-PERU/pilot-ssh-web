// Tras `vite build`: HTML por página pública, sitemap, robots y el cascarón
// del panel (app.html). Lee contacto y precios de la API.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { JSDOM } from 'jsdom'
import { loadEnv } from 'vite'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(raiz, 'dist')
const entorno = loadEnv('production', raiz, ['VITE_', 'PRERENDER_'])
const sitioUrl = entorno.VITE_SITE_URL.replace(/\/$/, '')
// Pruebas no debe salir en Google: ni sitemap ni permiso a los buscadores
const indexable = entorno.VITE_APP_ENV === 'prd'
// Si la API publicada no se alcanza desde donde se compila, otra dirección
const apiUrl = (entorno.PRERENDER_API_URL || entorno.VITE_API_URL).replace(/\/$/, '')

// Algunos módulos del cliente usan window al importarse
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: sitioUrl })
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
})
dom.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
})

async function leer(ruta) {
  const respuesta = await fetch(`${apiUrl}/api${ruta}`).catch((error) => {
    throw new Error(
      `La API no responde en ${apiUrl}: ${error.cause?.message ?? error.message}`,
    )
  })
  if (!respuesta.ok) throw new Error(`${apiUrl}/api${ruta} respondió ${respuesta.status}`)
  return respuesta.json()
}

const datos = { sitio: await leer('/site'), precios: await leer('/pricing') }
const { renderPage, buildHead, PAGINAS_PUBLICAS, LOGO } = await import(
  pathToFileURL(path.join(raiz, 'dist-ssr', 'prerender.js')).href
)

const plantilla = readFileSync(path.join(dist, 'index.html'), 'utf8')
const CABECERA = /<!--cabecera-->[\s\S]*?<!--\/cabecera-->/

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

rmSync(path.join(raiz, 'dist-ssr'), { recursive: true, force: true })
dom.window.close()
console.log(
  indexable
    ? '  sitemap.xml, robots.txt, app.html'
    : '  robots.txt (sin indexar), app.html',
)
