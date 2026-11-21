/** Viene de /config.js, que sirve Vite en local o escribe el arranque. */
export interface Configuracion {
  ambiente: 'local' | 'uat' | 'prod'
  /** Vacio en local, porque el proxy de Vite sirve /api. */
  apiUrl: string
}

declare global {
  var __PILOTSSH__: Partial<Configuracion> | undefined
}

const configuracion = globalThis.__PILOTSSH__ ?? {}
const apiUrl = (configuracion.apiUrl ?? '').replace(/\/$/, '')

export const env = {
  apiUrl,
  ambiente: configuracion.ambiente ?? 'local',

  /** Con wss fuera de local, porque el token viaja en la query. */
  get socketUrl() {
    if (!apiUrl) {
      const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocolo}//${window.location.host}`
    }
    return apiUrl.replace(/^http/, 'ws')
  },
} as const
