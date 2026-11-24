/** Logica pura de la terminal: sin DOM ni red, se prueba sin xterm. */

export const CIERRE = {
  NORMAL: 1000,
  SE_VA: 1001,
  ANORMAL: 1006,
  SERVIDOR: 1011,
  REINICIO: 1012,
  /** La web da por muerta una conexión que no contesta. No es 1000, así que
   *  el servidor guarda la shell para retomarla. */
  SIN_RESPUESTA: 4000,
  NO_AUTENTICADO: 4401,
  ORGANIZACION_SUSPENDIDA: 4402,
  SIN_PERMISO: 4403,
  CADUCADA: 4408,
  SIN_SALDO: 4412,
  DEMASIADOS_INTENTOS: 4429,
} as const

export type EstadoTerminal =
  | { fase: 'conectando' }
  /** Tras un corte, vuelve sola a la misma shell. */
  | { fase: 'reconectando' }
  | { fase: 'conectada' }
  | { fase: 'cerrada'; codigo: number; motivo: string; reintentable: boolean }

/** Cómo va el archivo que se está copiando al servidor. */
export type MensajeDeSubida = {
  type: 'subida'
  estado: 'preparada' | 'sigue' | 'guardada' | 'existe' | 'retomada' | 'error'
  ruta?: string
  /** Lo que ya llegó de una subida cortada, para seguir desde ahí. */
  enviado?: number
  message?: string
}

export type TipoDeEntrada = 'carpeta' | 'archivo' | 'enlace'

export interface EntradaDeArchivo {
  nombre: string
  tipo: TipoDeEntrada
  tamano: number
  /** ISO en UTC; null si el servidor no la da. */
  modificado: string | null
  permisos: string
  /** Por su nombre, como en `ls -l`. Una API anterior no los manda. */
  propietario?: string
  grupo?: string
  /** A dónde apunta un enlace. */
  destino?: string
}

/** Lo que hay en una carpeta, carpetas primero, como lo ordena el servidor. */
export type MensajeDeArchivos = {
  type: 'archivos'
  ruta: string
  inicio: string
  padre: string
  entradas: EntradaDeArchivo[]
  recortada: boolean
  error?: string
}

/** El texto de un archivo para el editor, o cómo quedó al guardarlo. */
export type MensajeDeContenido = {
  type: 'contenido'
  estado: 'listo' | 'guardado' | 'error'
  ruta?: string
  nombre?: string
  texto?: string
  tamano?: number
  version?: string
  /** Pasaba del tope: se ve el final y no se edita. */
  recortado?: boolean
  editable?: boolean
  message?: string
}

/** El enlace que baja el navegador, o por qué no se pudo. `cortada` avisa
 *  de un fallo a medias, sin un pedido pendiente. */
export type MensajeDeDescarga = {
  type: 'descarga'
  estado: 'preparada' | 'cortada' | 'error'
  nombre?: string
  /** Null en una carpeta comprimida. */
  tamano?: number | null
  ruta?: string
  url?: string
  message?: string
}

/** Resultado de renombrar, borrar o crear una carpeta. */
export type MensajeDeArchivo = {
  type: 'archivo'
  accion: 'renombrar' | 'borrar' | 'crear_carpeta' | 'permisos'
  estado: 'hecho' | 'error'
  ruta?: string
  message?: string
}

export type AccionDeTarea = 'medir' | 'comprimir' | 'extraer' | 'borrar' | 'empaquetar'

/** Cómo terminó algo que tarda y corre aparte de la shell. `pedida` es la
 *  ruta tal como se pidió, para emparejar la respuesta. */
export type MensajeDeTarea = {
  type: 'tarea'
  accion: AccionDeTarea
  pedida: string
  estado: 'hecho' | 'error'
  message?: string
  ruta?: string
  /** Lo creado al comprimir o extraer. */
  resultado?: string
  /** El enlace para bajar lo empaquetado. */
  url?: string
  nombre?: string
  tamano?: number
  archivos?: number
  carpetas?: number
  kb?: number
}

/** Respuesta al ping: con su número se mide la ida y vuelta de verdad. */
type MensajeDePong = { type: 'pong'; ping: number }

/** La shell vive en el servidor: su id permite volver a ella tras un corte. */
export type MensajeEntrante =
  | { type: 'output' | 'error'; message: string }
  | { type: 'sesion'; id: string; saltoMs?: number }
  | MensajeDeSubida
  | MensajeDeArchivos
  | MensajeDeDescarga
  | MensajeDeArchivo
  | MensajeDeContenido
  | MensajeDeTarea
  | MensajeDePong
  | { type: 'latido' }

/** La ruta del WebSocket. El vale se pide para esta misma ruta. */
export function buildTerminalSocketPath(serverId: string, credentialId: string): string {
  return `/ws/terminal/${serverId}/${credentialId}`
}

/** Vale de un uso en la query, porque el handshake del navegador no admite
 *  cabeceras. Con `sesion`, retoma la shell que quedó abierta. */
export function buildTerminalUrl(
  base: string,
  serverId: string,
  credentialId: string,
  vale: string,
  sesion?: string | null,
): string {
  const ruta = buildTerminalSocketPath(serverId, credentialId)
  const url = `${base}${ruta}?ticket=${encodeURIComponent(vale)}`
  return sesion ? `${url}&sesion=${encodeURIComponent(sesion)}` : url
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
    case CIERRE.REINICIO:
      return { motivo: 'Pilot SSH se actualizó. Reconectando…', reintentable: true }
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
    case CIERRE.DEMASIADOS_INTENTOS:
      return {
        motivo: 'Demasiados intentos seguidos. Espere un momento.',
        reintentable: false,
      }
    default:
      return { motivo: 'Se perdió la conexión con el servidor.', reintentable: true }
  }
}

/** Esperas que se doblan: una caída breve se recupera enseguida y una
 *  larga no martillea al servidor. Los intentos cubren los dos minutos que
 *  la shell aguanta viva sin nadie. */
export const RECONEXION = {
  intentos: 12,
  esperaBaseMs: 500,
  esperaMaximaMs: 15_000,
} as const

/** Cortes que no decide el usuario: red, relevo de versión o fallo del
 *  servidor. La shell sigue viva un par de minutos, así que se vuelve. */
const CIERRES_QUE_VUELVEN: number[] = [
  CIERRE.ANORMAL,
  CIERRE.REINICIO,
  CIERRE.SERVIDOR,
  CIERRE.SE_VA,
]

export function reconnectsAutomatically(codigo: number, intentosHechos: number): boolean {
  return CIERRES_QUE_VUELVEN.includes(codigo) && intentosHechos < RECONEXION.intentos
}

export function fetchEsperaDeReconexion(intentosHechos: number): number {
  const { esperaBaseMs, esperaMaximaMs } = RECONEXION
  return Math.min(esperaBaseMs * 2 ** intentosHechos, esperaMaximaMs)
}

/** Comillas simples: la shell no interpreta nada dentro. Una comilla
 *  interna se cierra, se escapa y se reabre: 'a'\\''b'. */
export function quoteForShell(valor: string): string {
  return `'${valor.replaceAll("'", "'\\''")}'`
}

/** `~` fuera de comillas: dentro, la shell no lo expande. */
export function quotePath(ruta: string): string {
  if (ruta === '~') return '~'
  if (ruta.startsWith('~/')) return `~/${quoteForShell(ruta.slice(2))}`
  return quoteForShell(ruta)
}

/** `cd` a la carpeta de trabajo, tecleado a la vista como lo haria la
 *  persona. */
export function buildInitialCommand(path: string): string | null {
  const limpio = path.trim()
  if (!limpio) return null
  return `cd ${quotePath(limpio)}\r`
}

const ESTADOS_DE_SUBIDA = [
  'preparada',
  'sigue',
  'guardada',
  'existe',
  'retomada',
  'error',
]
const ESTADOS_DE_DESCARGA = ['preparada', 'cortada', 'error']
const ACCIONES_DE_ARCHIVO: MensajeDeArchivo['accion'][] = [
  'renombrar',
  'borrar',
  'crear_carpeta',
  'permisos',
]
const ESTADOS_DE_CONTENIDO = ['listo', 'guardado', 'error']
const ACCIONES_DE_TAREA: AccionDeTarea[] = [
  'medir',
  'comprimir',
  'extraer',
  'borrar',
  'empaquetar',
]

const comoNumero = (valor: unknown) => (typeof valor === 'number' ? valor : undefined)
const comoTexto = (valor: unknown) => (typeof valor === 'string' ? valor : undefined)
const TIPOS_DE_ENTRADA: TipoDeEntrada[] = ['carpeta', 'archivo', 'enlace']

function parseEntrada(cruda: unknown): EntradaDeArchivo {
  const dato = (cruda ?? {}) as Partial<Record<keyof EntradaDeArchivo, unknown>>
  const tipo = TIPOS_DE_ENTRADA.find((uno) => uno === dato.tipo) ?? 'archivo'
  return {
    nombre: String(dato.nombre ?? ''),
    tipo,
    tamano: Number(dato.tamano ?? 0),
    modificado: typeof dato.modificado === 'string' ? dato.modificado : null,
    permisos: String(dato.permisos ?? ''),
    propietario: comoTexto(dato.propietario),
    grupo: comoTexto(dato.grupo),
    destino: comoTexto(dato.destino),
  }
}

export function parseIncoming(raw: string): MensajeEntrante | null {
  try {
    const dato = JSON.parse(raw) as {
      type?: string
      message?: string
      id?: string
      estado?: string
      error?: string
      ping?: number
      salto_ms?: number | null
      ruta?: string
      inicio?: string
      padre?: string
      entradas?: unknown
      recortada?: boolean
      nombre?: string
      tamano?: number | null
      url?: string
      accion?: string
      texto?: string
      version?: string
      editable?: boolean
      recortado?: boolean
    }
    if (dato.type === 'sesion') {
      if (typeof dato.id !== 'string') return null
      return { type: 'sesion', id: dato.id, saltoMs: dato.salto_ms ?? undefined }
    }
    if (dato.type === 'latido') return { type: 'latido' }
    if (dato.type === 'pong') {
      return typeof dato.ping === 'number' ? { type: 'pong', ping: dato.ping } : null
    }
    if (dato.type === 'archivos') {
      return {
        type: 'archivos',
        ruta: String(dato.ruta ?? ''),
        inicio: String(dato.inicio ?? ''),
        padre: String(dato.padre ?? ''),
        entradas: Array.isArray(dato.entradas) ? dato.entradas.map(parseEntrada) : [],
        recortada: Boolean(dato.recortada),
        error: dato.error,
      }
    }
    if (dato.type === 'contenido') {
      if (!ESTADOS_DE_CONTENIDO.includes(dato.estado ?? '')) return null
      return {
        type: 'contenido',
        estado: dato.estado as MensajeDeContenido['estado'],
        ruta: dato.ruta,
        nombre: dato.nombre,
        texto: dato.texto,
        tamano: dato.tamano ?? undefined,
        version: dato.version,
        recortado: dato.recortado,
        editable: dato.editable,
        message: dato.message,
      }
    }
    if (dato.type === 'descarga') {
      if (!ESTADOS_DE_DESCARGA.includes(dato.estado ?? '')) return null
      return {
        type: 'descarga',
        estado: dato.estado as MensajeDeDescarga['estado'],
        nombre: dato.nombre,
        tamano: dato.tamano,
        ruta: dato.ruta,
        url: dato.url,
        message: dato.message,
      }
    }
    if (dato.type === 'tarea') {
      const accion = ACCIONES_DE_TAREA.find((una) => una === dato.accion)
      if (!accion) return null
      const resto = dato as Record<string, unknown>
      return {
        type: 'tarea',
        accion,
        pedida: String(resto.pedida ?? ''),
        estado: dato.estado === 'hecho' ? 'hecho' : 'error',
        message: dato.message,
        ruta: dato.ruta,
        resultado: typeof resto.resultado === 'string' ? resto.resultado : undefined,
        url: typeof resto.url === 'string' ? resto.url : undefined,
        nombre: dato.nombre,
        tamano: comoNumero(dato.tamano),
        archivos: comoNumero(resto.archivos),
        carpetas: comoNumero(resto.carpetas),
        kb: comoNumero(resto.kb),
      }
    }
    if (dato.type === 'archivo') {
      const accion = ACCIONES_DE_ARCHIVO.find((una) => una === dato.accion)
      if (!accion) return null
      return {
        type: 'archivo',
        accion,
        estado: dato.estado === 'hecho' ? 'hecho' : 'error',
        ruta: dato.ruta,
        message: dato.message,
      }
    }
    if (dato.type === 'subida') {
      if (!ESTADOS_DE_SUBIDA.includes(dato.estado ?? '')) return null
      return {
        type: 'subida',
        estado: dato.estado as MensajeDeSubida['estado'],
        ruta: dato.ruta,
        enviado: comoNumero((dato as Record<string, unknown>).enviado),
        message: dato.message,
      }
    }
    if (typeof dato.message !== 'string') return null
    return { type: dato.type === 'error' ? 'error' : 'output', message: dato.message }
  } catch {
    // Marco no JSON: ajeno al protocolo, se ignora
    return null
  }
}
