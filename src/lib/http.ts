import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { clearSession, getSession, saveSession } from '@/features/auth/token-store'
import { env } from '@/lib/env'
import type { RefreshResponse } from '@/types/api'

const RUTA_REFRESCO = '/auth/refresh'

/** Se emite cuando el refresco falla: la sesion es irrecuperable. */
export const SESION_CADUCADA = 'pilotssh:sesion-caducada'

interface RetriableConfig extends InternalAxiosRequestConfig {
  /** Un 401 tras refrescar no se vuelve a reintentar: seria un bucle. */
  yaReintentada?: boolean
}

export const http = axios.create({
  baseURL: `${env.apiUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

/** Sin token en el cliente del refresco: solo lleva el refresh en el cuerpo. */
const httpSinSesion = axios.create({
  baseURL: `${env.apiUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

http.interceptors.request.use((config) => {
  const sesion = getSession()
  if (sesion) config.headers.Authorization = `Bearer ${sesion.access}`
  return config
})

// Un solo refresco para todas las peticiones en vuelo: con rotacion,
// cada refresh invalida el anterior
let refrescoEnCurso: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const sesion = getSession()
  if (!sesion) throw new Error('sin sesion')

  const { data } = await httpSinSesion.post<RefreshResponse>(RUTA_REFRESCO, {
    refresh: sesion.refresh,
  })

  saveSession({
    access: data.access,
    // ROTATE_REFRESH_TOKENS deja el anterior en la lista negra
    refresh: data.refresh ?? sesion.refresh,
    expiresAt: '',
    // Identifica este equipo en la lista de sesiones aunque el token rote
    sessionId: sesion.sessionId,
  })
  return data.access
}

/** El error de una descarga llega como Blob: se parsea para poder
 *  refrescar la sesión y mostrar el mensaje del servidor. */
async function leerSobreDeDescarga(error: AxiosError) {
  const respuesta = error.response
  if (!(respuesta?.data instanceof Blob) || !respuesta.data.type.includes('json')) return
  try {
    respuesta.data = JSON.parse(await respuesta.data.text())
  } catch {
    // Sin JSON dentro no hay sobre que leer: queda como llegó
  }
}

function esFalloDeSesion(error: AxiosError): boolean {
  if (error.response?.status !== 401) return false
  const code = (error.response.data as { code?: string } | undefined)?.code
  return code === 'token_invalido' || code === 'no_autenticado'
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    await leerSobreDeDescarga(error)
    const original = error.config as RetriableConfig | undefined

    if (!original || original.yaReintentada || !esFalloDeSesion(error)) {
      return Promise.reject(error)
    }
    if (!getSession()) return Promise.reject(error)

    original.yaReintentada = true

    try {
      refrescoEnCurso ??= refreshAccessToken().finally(() => {
        refrescoEnCurso = null
      })
      const access = await refrescoEnCurso

      original.headers.Authorization = `Bearer ${access}`
      return http(original)
    } catch {
      // El refresh tambien caduco o esta en la lista negra: no hay vuelta
      clearSession()
      window.dispatchEvent(new CustomEvent(SESION_CADUCADA))
      return Promise.reject(error)
    }
  },
)
