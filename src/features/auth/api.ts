import { http } from '@/lib/http'
import type {
  AccountActivityList,
  CurrentUser,
  LoginResponse,
  OnboardingState,
  Organization,
  SessionTokens,
} from '@/types/api'

export interface Credentials {
  email: string
  password: string
}

export interface RegistrationInput extends Credentials {
  /** Versión de los términos aceptados. */
  terms_version: string
  full_name?: string
  /** Testigo de invitación: la cuenta nace dentro de ese equipo. */
  invitation?: string
}

/** Sin tokens: crea la cuenta y su espacio personal. */
export interface RegistrationResponse {
  message: string
  organization: Organization
}

export async function login(credentials: Credentials) {
  const { data } = await http.post<LoginResponse>('/auth/login', credentials)
  return data
}

/** Segundo paso: desafío del login más el código del correo, de la app o de
 *  respaldo. */
export async function verifyTwoFactor(input: { challenge: string; code: string }) {
  const { data } = await http.post<SessionTokens>('/auth/two-factor', input)
  return data
}

/** Activar exige un código del correo: quien no lo recibe no queda fuera. */
export async function requestTwoFactorCode() {
  const { data } = await http.post<{ sent: true }>('/auth/two-factor/settings', {})
  return data
}

export async function enableTwoFactor(code: string) {
  const { data } = await http.post<{ two_factor_enabled: boolean }>(
    '/auth/two-factor/settings',
    { code },
  )
  return data
}

/** Clave y enlace `otpauth://` para el QR. Con la contraseña: una sesión
 *  ajena abierta no cambia la segunda llave. */
export async function startAuthenticatorSetup(currentPassword: string) {
  const { data } = await http.post<{ secret: string; uri: string }>(
    '/auth/two-factor/app',
    { current_password: currentPassword },
  )
  return data
}

/** El primer código de la app la activa y trae los códigos de respaldo. */
export async function confirmAuthenticator(code: string) {
  const { data } = await http.post<{ recovery_codes: string[] }>(
    '/auth/two-factor/app/confirm',
    { code },
  )
  return data
}

/** Los anteriores dejan de servir. */
export async function regenerateRecoveryCodes(currentPassword: string) {
  const { data } = await http.post<{ recovery_codes: string[] }>(
    '/auth/two-factor/recovery-codes',
    { current_password: currentPassword },
  )
  return data
}

/** Exige la contraseña: protege ante un equipo desbloqueado ajeno. */
export async function disableTwoFactor(currentPassword: string) {
  const { data } = await http.delete<{ two_factor_enabled: boolean }>(
    '/auth/two-factor/settings',
    { data: { current_password: currentPassword } },
  )
  return data
}

/** Confirmar el correo da el bono de bienvenida y lo gratuito de cada día. */
export async function requestEmailVerification() {
  const { data } = await http.post<{ sent: true }>('/me/email/verification', {})
  return data
}

export async function verifyEmail(code: string) {
  const { data } = await http.post<CurrentUser>('/me/email/verification', { code })
  return data
}

export async function register(input: RegistrationInput) {
  const { data } = await http.post<RegistrationResponse>('/auth/register', input)
  return data
}

/** El refresh es la credencial: el access puede estar caducado. */
export async function logout(refresh: string) {
  await http.post('/auth/logout', { refresh })
}

export async function fetchCurrentUser() {
  const { data } = await http.get<CurrentUser>('/me')
  return data
}

/** Respuesta de PATCH /me: solo el perfil. Para el resto, invalidar la
 *  consulta del usuario. */
export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string
  display_name: string
  time_zone: string
  notify_time_zone_change: boolean
}

export type ProfileInput = Partial<
  Pick<Profile, 'full_name' | 'phone' | 'time_zone' | 'notify_time_zone_change'>
>

export async function updateProfile(input: ProfileInput) {
  const { data } = await http.patch<Profile>('/me', input)
  return data
}

/** Content-Type sin fijar: el cliente pone JSON por defecto y el servidor
 *  rechazaría el formato. */
export async function uploadAvatar(imagen: Blob) {
  const cuerpo = new FormData()
  cuerpo.append('avatar', imagen, 'avatar.webp')
  const { data } = await http.post<CurrentUser>('/me/avatar', cuerpo, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function deleteAvatar() {
  const { data } = await http.delete<CurrentUser>('/me/avatar')
  return data
}

/** Código al correo nuevo. Hasta confirmarlo vale el anterior: un error
 *  al teclear no deja a nadie fuera. */
export async function requestEmailChange(input: {
  email: string
  current_password: string
}) {
  const { data } = await http.post<{ sent: true; email: string }>('/me/email', input)
  return data
}

export async function confirmEmailChange(code: string) {
  const { data } = await http.post<CurrentUser>('/me/email/confirm', { code })
  return data
}

/** Cierra todas las sesiones, también la propia: quien robó la clave no
 *  sigue dentro con su token. */
export async function changePassword(input: {
  current_password: string
  new_password: string
}) {
  const { data } = await http.post<{ message: string; revoked: number }>(
    '/auth/password/change',
    input,
  )
  return data
}

export interface Sesion {
  id: string
  description: string
  ip: string | null
  created_at: string
  last_used_at: string
}

export const clavesSesion = { todas: ['sessions'] as const }

export async function fetchSessions() {
  const { data } = await http.get<Sesion[]>('/auth/sessions')
  return data
}

export async function closeSession(id: string) {
  await http.delete(`/auth/sessions/${id}`)
}

/** Cierra las demás y deja esta abierta. */
export async function closeOtherSessions(actual: string | null) {
  const { data } = await http.post<{ revoked: number }>('/auth/sessions/close-others', {
    keep: actual,
  })
  return data
}

/** Filtros de la actividad; los aplica el servidor, que pagina. */
export interface FiltrosDeActividad {
  search?: string
  category?: string
  device?: string
  /** `AAAA-MM-DD`; cuenta el día entero. */
  from?: string
  to?: string
}

/** Actividad de la propia cuenta: accesos, contraseña, dos pasos, correo
 *  y sesiones cerradas. */
export async function fetchAccountActivity(
  pagina: number,
  porPagina: number,
  filtros: FiltrosDeActividad = {},
) {
  const { data } = await http.get<AccountActivityList>('/me/activity', {
    params: { page: pagina, page_size: porPagina, ...filtros },
  })
  return data
}

/** Responde igual exista o no la cuenta: no delata quién está registrado. */
export async function requestPasswordReset(email: string) {
  const { data } = await http.post<{ message: string }>('/auth/password/forgot', {
    email,
  })
  return data
}

export async function resetPassword(input: { token: string; new_password: string }) {
  const { data } = await http.post<{ message: string; revoked: number }>(
    '/auth/password/reset',
    input,
  )
  return data
}

export async function completeOnboarding() {
  const { data } = await http.post<OnboardingState>('/onboarding', {})
  return data
}
