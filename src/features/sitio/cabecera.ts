import { buildStructuredData } from '@/features/sitio/datos-estructurados'
import { ID_DE_LOS_DATOS, type DatosDelSitio } from '@/features/sitio/datos-incrustados'
import type { PaginaPublica } from '@/features/sitio/paginas'

export interface OpcionesDeCabecera {
  sitioUrl: string
  imagenUrl: string
  logoUrl: string
  /** Solo producción: pruebas no debe salir en Google. */
  indexable: boolean
}

const IMAGEN = {
  ancho: 1200,
  alto: 630,
  alt: 'Pilot SSH: acceso SSH seguro para equipos',
}

/** `<head>` de una página compilada: lo leen buscadores y vistas previas. */
export function buildHead(
  pagina: PaginaPublica,
  datos: DatosDelSitio,
  { sitioUrl, imagenUrl, logoUrl, indexable }: OpcionesDeCabecera,
): string {
  const url = pagina.ruta === '/' ? sitioUrl : `${sitioUrl}${pagina.ruta}`
  const meta = (atributo: string, clave: string, valor: string | number) =>
    `<meta ${atributo}="${clave}" content="${escapar(String(valor))}" />`

  const etiquetas = [
    `<title>${escapar(pagina.titulo)}</title>`,
    meta('name', 'description', pagina.descripcion),
    meta('name', 'robots', indexable ? 'index, follow' : 'noindex, nofollow'),
    `<link rel="canonical" href="${escapar(url)}" />`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'Pilot SSH'),
    meta('property', 'og:locale', 'es_PE'),
    meta('property', 'og:url', url),
    meta('property', 'og:title', pagina.titulo),
    meta('property', 'og:description', pagina.descripcion),
    meta('property', 'og:image', imagenUrl),
    meta('property', 'og:image:width', IMAGEN.ancho),
    meta('property', 'og:image:height', IMAGEN.alto),
    meta('property', 'og:image:alt', IMAGEN.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', pagina.titulo),
    meta('name', 'twitter:description', pagina.descripcion),
    meta('name', 'twitter:image', imagenUrl),
    meta('name', 'twitter:image:alt', IMAGEN.alt),
    ...buildStructuredData(pagina, { sitioUrl, logoUrl, ...datos }).map(
      (bloque) => `<script type="application/ld+json">${comoJson(bloque)}</script>`,
    ),
    `<script type="application/json" id="${ID_DE_LOS_DATOS}">${comoJson(datos)}</script>`,
  ]
  return etiquetas.join('\n    ')
}

function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Dentro de `<script>`, un `</script>` en un dato cerraría la etiqueta. */
function comoJson(valor: unknown): string {
  return JSON.stringify(valor).replaceAll('<', '\\u003c')
}
