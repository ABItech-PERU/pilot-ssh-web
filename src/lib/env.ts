/** Origen de la API. Vacio en desarrollo: el proxy de Vite sirve /api. */
const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const env = {
  apiUrl,
  /** dev, uat o prd: el mismo valor que APP_ENV en la API. */
  ambiente: import.meta.env.VITE_APP_ENV ?? 'dev',

  /** Base del WebSocket. Produccion exige wss: el token viaja en la query. */
  get socketUrl() {
    if (!apiUrl) {
      const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocolo}//${window.location.host}`
    }
    return apiUrl.replace(/^http/, 'ws')
  },
} as const
