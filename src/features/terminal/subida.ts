/** Copiar un archivo a la shell abierta, en tramos por el mismo socket. */

/** 64 KB: más grande no acelera y el navegador se atraganta. */
export const TAMANO_DE_TRAMO = 64 * 1024

/** Se espera cuando el socket acumula más de esto sin llegar a mandarlo. */
const COLA_MAXIMA = 512 * 1024

const ESPERA_DE_COLA_MS = 20

export interface AvanceDeSubida {
  nombre: string
  enviado: number
  total: number
}

export function fetchPorcentaje({ enviado, total }: AvanceDeSubida): number {
  return total ? Math.min(100, Math.round((enviado / total) * 100)) : 0
}

/** Manda el archivo entero y va contando lo que ya salió. */
export async function enviarPorTramos(
  socket: WebSocket,
  archivo: File,
  onAvance: (enviado: number) => void,
): Promise<void> {
  let enviado = 0

  while (enviado < archivo.size) {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error('Se perdió la conexión durante la copia.')
    }
    const tramo = archivo.slice(enviado, enviado + TAMANO_DE_TRAMO)
    socket.send(await tramo.arrayBuffer())
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
