/** Copiar un archivo a la shell abierta, en tramos por el mismo socket. */

/** 32 KB: lo que se teclea viaja por el mismo socket y espera detrás. */
export const TAMANO_DE_TRAMO = 32 * 1024

/** Se espera cuando el socket acumula más de esto sin llegar a mandarlo. */
const COLA_MAXIMA = 96 * 1024

const ESPERA_DE_COLA_MS = 20

export interface AvanceDeSubida {
  nombre: string
  carpeta: string
  enviado: number
  total: number
}

/** La carpeta de una ruta ya resuelta por el servidor. */
export function fetchCarpetaDeLaRuta(ruta: string): string {
  const corte = ruta.lastIndexOf('/')
  return corte > 0 ? ruta.slice(0, corte) : '/'
}

export function fetchPorcentaje({ enviado, total }: AvanceDeSubida): number {
  return total ? Math.min(100, Math.round((enviado / total) * 100)) : 0
}

interface Envio {
  onAvance: (enviado: number) => void
  sigueViva: () => boolean
  /** Turno para el siguiente tramo: lo da el servidor al tomar el anterior. */
  pedirTurno: () => Promise<void>
}

/** Manda el archivo entero y va contando lo que ya salió. */
export async function enviarPorTramos(
  socket: WebSocket,
  archivo: File,
  { onAvance, sigueViva, pedirTurno }: Envio,
): Promise<void> {
  let enviado = 0

  while (enviado < archivo.size) {
    if (!sigueViva()) throw new Error('Se canceló la copia.')
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error('Se perdió la conexión durante la copia.')
    }
    await pedirTurno()

    const tramo = archivo.slice(enviado, enviado + TAMANO_DE_TRAMO)
    socket.send(await fetchDatos(tramo))
    enviado += tramo.size
    onAvance(enviado)
    await esperarALaCola(socket)
  }
}

/** Sin esto, un archivo grande se encola entero en memoria del navegador. */
async function esperarALaCola(socket: WebSocket): Promise<void> {
  while (socket.bufferedAmount > COLA_MAXIMA && socket.readyState === WebSocket.OPEN) {
    await new Promise((seguir) => setTimeout(seguir, ESPERA_DE_COLA_MS))
  }
}

/** Una carpeta soltada, o un archivo que se movió, no se dejan leer. */
async function fetchDatos(tramo: Blob): Promise<ArrayBuffer> {
  try {
    return await tramo.arrayBuffer()
  } catch {
    throw new Error('No se pudo leer el archivo. ¿Era una carpeta?')
  }
}
