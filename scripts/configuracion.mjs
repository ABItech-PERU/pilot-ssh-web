// Configuracion del ambiente: la leen Vite en desarrollo y el arranque del
// contenedor en Docker, con las mismas reglas

const AMBIENTES = ['dev', 'uat', 'prd']
const LOCALES = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])

/** Origen publico con https: la web publicada llama ahi desde el navegador. */
function assertPublicOrigin(nombre, valor) {
  let url = null
  try {
    url = new URL(valor)
  } catch {
    // Vacia o mal escrita
  }
  if (url?.protocol === 'https:' && !LOCALES.has(url.hostname) && url.origin === valor) {
    return
  }
  throw new Error(
    `${nombre} tiene que ser un origen público con https, sin ruta, y es «${valor}».`,
  )
}

/** Fuera de dev, la API y la web tienen que ser publicas y con https. */
export function readConfiguracion(variables) {
  const ambiente = variables.APP_ENV ?? ''
  if (!AMBIENTES.includes(ambiente)) {
    throw new Error(
      `APP_ENV debe ser ${AMBIENTES.join(', ')}; en el .env dice «${ambiente}».`,
    )
  }

  const apiUrl = (variables.APP_API_URL ?? '').replace(/\/$/, '')
  const sitioUrl = (variables.APP_SITE_URL ?? '').replace(/\/$/, '')
  if (ambiente !== 'dev') {
    assertPublicOrigin('APP_API_URL', apiUrl)
    assertPublicOrigin('APP_SITE_URL', sitioUrl)
  }

  return { ambiente, apiUrl, sitioUrl }
}

/** `/config.js`, que lee src/lib/env.ts. Solo lo que el navegador necesita. */
export function buildConfigScript({ ambiente, apiUrl }) {
  return `window.__PILOTSSH__ = ${JSON.stringify({ ambiente, apiUrl })}\n`
}
