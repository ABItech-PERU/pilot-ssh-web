/** Sesión fuera de React: el cliente HTTP la necesita sin hooks.
 *
 *  Solo en memoria. El refresh vive en una cookie httpOnly de la API, así
 *  que un XSS no se lleva más que el access de esta pestaña.
 */

/** Solo dice si hay sesión, sin credencial. Evita un refresco en cada visita. */
const MARCA = 'pilotssh.hay-sesion'
const SESION_VIEJA = 'pilotssh.session'

export interface StoredSession {
  access: string
  expiresAt: string
  /** Identifica este dispositivo en la lista de sesiones abiertas. */
  sessionId?: string
}

type Listener = (session: StoredSession | null) => void

let actual: StoredSession | null = null
const listeners = new Set<Listener>()
const alEntrarFuera = new Set<() => void>()

function escribirMarca(hay: boolean) {
  try {
    if (hay) window.localStorage.setItem(MARCA, '1')
    else window.localStorage.removeItem(MARCA)
  } catch {
    // Sin almacenamiento, recargar pide iniciar sesión de nuevo
  }
}

export function getSession(): StoredSession | null {
  return actual
}

export function getAccessToken(): string | null {
  return actual?.access ?? null
}

/** Si al recargar vale la pena pedir un access con la cookie. */
export function mayHaveSession(): boolean {
  try {
    return window.localStorage.getItem(MARCA) === '1'
  } catch {
    return false
  }
}

export function saveSession(session: StoredSession) {
  actual = session
  escribirMarca(true)
  notify()
}

export function clearSession() {
  actual = null
  escribirMarca(false)
  notify()
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Avisa cuando otra pestaña inicia sesión, para pedir aquí un access. */
export function onSignedInElsewhere(callback: () => void) {
  alEntrarFuera.add(callback)
  return () => {
    alEntrarFuera.delete(callback)
  }
}

function notify() {
  for (const listener of listeners) listener(actual)
}

try {
  window.localStorage.removeItem(SESION_VIEJA)
} catch {
  // Nada que limpiar si el almacenamiento está bloqueado
}

/** Las pestañas comparten la marca. Su cambio dice si se entró o se salió. */
window.addEventListener('storage', (evento) => {
  if (evento.key !== MARCA) return
  if (evento.newValue === '1') {
    for (const callback of alEntrarFuera) callback()
    return
  }
  actual = null
  notify()
})
