/** De /config.js: lo sirve Vite en dev y lo escribe el arranque en Docker. */
export interface Configuracion {
  ambiente: 'dev' | 'uat' | 'prd'
  /** Vacio en dev: el proxy de Vite sirve /api. */
  apiUrl: string
}

declare global {
  var __PILOTSSH__: Partial<Configuracion> | undefined
}

const configuracion = globalThis.__PILOTSSH__ ?? {}
const apiUrl = (configuracion.apiUrl ?? '').replace(/\/$/, '')

export const env = {
  apiUrl,
  ambiente: configuracion.ambiente ?? 'dev',

  /** wss fuera de dev: el token viaja en la query. */
  get socketUrl() {
    if (!apiUrl) {
      const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocolo}//${window.location.host}`
    }
    return apiUrl.replace(/^http/, 'ws')
  },
} as const
