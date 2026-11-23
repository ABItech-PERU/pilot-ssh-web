import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import {
  clearSession,
  getSession,
  mayHaveSession,
  saveSession,
} from '@/features/auth/token-store'
import { env } from '@/lib/env'
import type { RefreshResponse } from '@/types/api'

const RUTA_REFRESCO = '/auth/refresh'
const CANDADO_DE_REFRESCO = 'pilotssh-refresco'

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

/** Para las rutas que leen la cookie del refresh, sin Bearer. La API exige
 *  la cabecera propia contra CSRF. */
export const httpConCookie = axios.create({
  baseURL: `${env.apiUrl}/api`,
  headers: { 'X-Pilot-Ssh': '1' },
  timeout: 20000,
  withCredentials: true,
})

http.interceptors.request.use((config) => {
  const sesion = getSession()
  if (sesion) config.headers.Authorization = `Bearer ${sesion.access}`
  return config
})

/** En fila con las demás pestañas. Con rotación, la segunda mandaría la
 *  cookie que la primera acaba de revocar. */
function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return tarea()
  return navigator.locks.request(CANDADO_DE_REFRESCO, tarea)
}

// Un solo refresco para todas las peticiones en vuelo de esta pestaña
let refrescoEnCurso: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  refrescoEnCurso ??= enFila(async () => {
    const { data } = await httpConCookie.post<RefreshResponse>(RUTA_REFRESCO)
    saveSession({
      access: data.access,
      expiresAt: data.expires_at,
      sessionId: data.session_id ?? undefined,
    })
    return data.access
  }).finally(() => {
    refrescoEnCurso = null
  })
  return refrescoEnCurso
}

/** Al cargar no hay access en memoria, así que se pide con la cookie. */
export async function restoreSession(): Promise<void> {
  if (getSession() || !mayHaveSession()) return
  try {
    await refreshAccessToken()
  } catch {
    // La cookie caducó o se cerró en otro equipo. Toca iniciar sesión
    clearSession()
  }
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
      const access = await refreshAccessToken()

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
