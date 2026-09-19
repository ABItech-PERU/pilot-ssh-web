/** Logica pura de la terminal: sin DOM ni red, se prueba sin xterm. */

export const CIERRE = {
  NORMAL: 1000,
  ANORMAL: 1006,
  NO_AUTENTICADO: 4401,
  ORGANIZACION_SUSPENDIDA: 4402,
  SIN_PERMISO: 4403,
  CADUCADA: 4408,
  SIN_SALDO: 4412,
} as const

export type EstadoTerminal =
  | { fase: 'conectando' }
  | { fase: 'conectada' }
  | { fase: 'cerrada'; codigo: number; motivo: string; reintentable: boolean }

export interface MensajeEntrante {
  type: 'output' | 'error'
  message: string
}

/** Token en la query: el handshake del navegador no admite cabeceras.
 *  Dura 30 minutos y produccion exige wss. */
export function buildTerminalUrl(
  base: string,
  serverId: string,
  credentialId: string,
  token: string,
): string {
  return `${base}/ws/terminal/${serverId}/${credentialId}?token=${encodeURIComponent(token)}`
}

export function buildTerminalPath(serverId: string, credentialId: string): string {
  return `/app/servers/${serverId}/terminal?credential=${credentialId}`
}

/** Motivo visible y si reintentar sirve: un 4403 no, una caida de red si. */
export function describeClose(codigo: number): {
  motivo: string
  reintentable: boolean
} {
  switch (codigo) {
    case CIERRE.NORMAL:
      return { motivo: 'Sesión cerrada.', reintentable: true }
    case CIERRE.NO_AUTENTICADO:
      return { motivo: 'La sesión expiró. Vuelva a iniciar sesión.', reintentable: false }
    case CIERRE.ORGANIZACION_SUSPENDIDA:
      return {
        motivo:
          'La organización está suspendida. Quien la administra recibió el motivo por correo.',
        reintentable: false,
      }
    case CIERRE.SIN_PERMISO:
      return {
        motivo: 'No tiene permiso para entrar a este servidor con esa credencial.',
        reintentable: false,
      }
    case CIERRE.CADUCADA:
      return {
        motivo: 'La sesión se cerró por tiempo. Puede abrir otra.',
        reintentable: true,
      }
    case CIERRE.SIN_SALDO:
      return {
        motivo: 'Sin créditos para abrir más terminales hoy.',
        reintentable: false,
      }
    default:
      return { motivo: 'Se perdió la conexión con el servidor.', reintentable: true }
  }
}

/** Comillas simples: la shell no interpreta nada dentro. Una comilla
 *  interna se cierra, se escapa y se reabre: 'a'\\''b'. */
export function quoteForShell(valor: string): string {
  return `'${valor.replaceAll("'", "'\\''")}'`
}

/** `cd` a la carpeta de trabajo, tecleado a la vista como lo haria la
 *  persona. */
export function buildInitialCommand(path: string): string | null {
  const limpio = path.trim()
  if (!limpio) return null
  return `cd ${quoteForShell(limpio)}\r`
}

export function parseIncoming(raw: string): MensajeEntrante | null {
  try {
    const dato = JSON.parse(raw) as Partial<MensajeEntrante>
    if (typeof dato.message !== 'string') return null
    return { type: dato.type === 'error' ? 'error' : 'output', message: dato.message }
  } catch {
    // Marco no JSON: ajeno al protocolo, se ignora
    return null
  }
}
