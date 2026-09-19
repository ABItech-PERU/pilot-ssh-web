import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useSyncExternalStore } from 'react'

import * as authApi from '@/features/auth/api'
import {
  clearSession,
  getSession,
  saveSession,
  subscribe,
} from '@/features/auth/token-store'
import { SESION_CADUCADA } from '@/lib/http'
import type { CurrentUser, SessionTokens } from '@/types/api'
import { fijarZona } from '@/lib/zona-horaria'

export const CLAVE_USUARIO = ['current-user'] as const

/** Contraseña correcta: abre la sesión o deja pendiente el código del
 *  correo, nunca ambas. */
export type LoginResult =
  | { estado: 'listo'; user: CurrentUser }
  | { estado: 'dos_pasos'; challenge: string; email: string }

interface SessionContextValue {
  user: CurrentUser | null
  isAuthenticated: boolean
  /** Hay token guardado, pero aún sin identidad. */
  isResolving: boolean
  signIn: (credentials: authApi.Credentials) => Promise<LoginResult>
  completeTwoFactor: (input: { challenge: string; code: string }) => Promise<CurrentUser>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const cliente = useQueryClient()

  // Token fuera de React (lo usa el cliente HTTP); cambia desde otras
  // pestañas. En el prerenderizado no hay sesión: tercer argumento
  const sesion = useSyncExternalStore(subscribe, getSession, () => null)
  const hasToken = Boolean(sesion)

  const { data: user, isLoading } = useQuery({
    queryKey: CLAVE_USUARIO,
    queryFn: authApi.fetchCurrentUser,
    enabled: hasToken,
    staleTime: 5 * 60_000,
  })

  // En el render, no en un efecto: las fechas de los hijos se formatean al
  // pintarse y saldrían un instante en la zona del equipo
  fijarZona(user?.time_zone ?? '')

  const abrir = useCallback(
    (respuesta: SessionTokens) => {
      saveSession({
        access: respuesta.access,
        refresh: respuesta.refresh,
        expiresAt: respuesta.expires_at,
        sessionId: respuesta.session_id,
      })
      // El login trae la identidad completa: sin vuelta extra a /me
      cliente.setQueryData(CLAVE_USUARIO, respuesta.user)
      return respuesta.user
    },
    [cliente],
  )

  const signIn = useCallback(
    async (credentials: authApi.Credentials): Promise<LoginResult> => {
      const respuesta = await authApi.login(credentials)

      if ('two_factor_required' in respuesta) {
        return {
          estado: 'dos_pasos',
          challenge: respuesta.challenge,
          email: respuesta.email,
        }
      }
      return { estado: 'listo', user: abrir(respuesta) }
    },
    [abrir],
  )

  const completeTwoFactor = useCallback(
    async (input: { challenge: string; code: string }) =>
      abrir(await authApi.verifyTwoFactor(input)),
    [abrir],
  )

  const signOut = useCallback(async () => {
    const actual = getSession()
    clearSession()
    cliente.clear()

    if (!actual) return
    try {
      await authApi.logout(actual.refresh)
    } catch {
      // Sesión local ya cerrada; el refresh caduca solo en 7 días
    }
  }, [cliente])

  // Refresco fallido en cualquier petición: la interfaz se entera aquí
  useEffect(() => {
    const alCaducar = () => cliente.clear()
    window.addEventListener(SESION_CADUCADA, alCaducar)
    return () => window.removeEventListener(SESION_CADUCADA, alCaducar)
  }, [cliente])

  const valor: SessionContextValue = {
    user: user ?? null,
    isAuthenticated: hasToken && Boolean(user),
    isResolving: hasToken && isLoading,
    signIn,
    completeTwoFactor,
    signOut,
  }

  return <SessionContext value={valor}>{children}</SessionContext>
}

export function useSession() {
  const contexto = use(SessionContext)
  if (!contexto) throw new Error('useSession necesita estar dentro de SessionProvider')
  return contexto
}
