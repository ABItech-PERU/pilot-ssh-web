/** Sesión fuera de React: el cliente HTTP la necesita sin hooks.
 *
 *  En localStorage: el WebSocket exige el access en la query, legible por
 *  JavaScript. Pendiente: cookie httpOnly más ticket para el socket.
 */

const CLAVE = 'pilotssh.session'

export interface StoredSession {
  access: string
  refresh: string
  expiresAt: string
  /** Identifica este dispositivo en la lista de sesiones abiertas. */
  sessionId?: string
}

type Listener = (session: StoredSession | null) => void

let cached: StoredSession | null | undefined
const listeners = new Set<Listener>()

function parse(raw: string | null): StoredSession | null {
  if (!raw) return null
  try {
    const dato = JSON.parse(raw) as Partial<StoredSession>
    if (!dato.access || !dato.refresh) return null
    return {
      access: dato.access,
      refresh: dato.refresh,
      expiresAt: dato.expiresAt ?? '',
      sessionId: dato.sessionId,
    }
  } catch {
    // Entrada corrupta o de otra versión: se descarta y se pide login
    return null
  }
}

export function getSession(): StoredSession | null {
  if (cached === undefined) {
    try {
      cached = parse(window.localStorage.getItem(CLAVE))
    } catch {
      // Ventana privada o almacenamiento bloqueado: la sesión dura la pestaña
      cached = null
    }
  }
  return cached
}

export function getAccessToken(): string | null {
  return getSession()?.access ?? null
}

export function saveSession(session: StoredSession) {
  cached = session
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(session))
  } catch {
    // Sin almacenamiento, la sesión vive en memoria hasta recargar
  }
  notify()
}

export function clearSession() {
  cached = null
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    // Nada que limpiar si nunca se pudo escribir
  }
  notify()
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  const actual = getSession()
  for (const listener of listeners) listener(actual)
}

/** Sincroniza la sesión con los cambios de otras pestañas. */
window.addEventListener('storage', (evento) => {
  if (evento.key !== CLAVE) return
  cached = parse(evento.newValue)
  notify()
})
