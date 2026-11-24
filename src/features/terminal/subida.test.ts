import { describe, expect, it } from 'vitest'

import {
  enviarPorTramos,
  fetchCarpetaDeLaRuta,
  TAMANO_DE_TRAMO,
} from '@/features/terminal/subida'

class SocketDePrueba {
  bufferedAmount = 0
  enviados: ArrayBuffer[] = []

  constructor(readonly readyState: number = WebSocket.OPEN) {}

  send(datos: ArrayBuffer) {
    this.enviados.push(datos)
  }
}

const buildSocket = (readyState?: number) =>
  new SocketDePrueba(readyState) as unknown as WebSocket

const buildArchivo = (bytes: number) =>
  new File([new Uint8Array(bytes)], 'deploy.bin') as File

describe('fetchCarpetaDeLaRuta', () => {
  it('se queda con la carpeta', () => {
    expect(fetchCarpetaDeLaRuta('/tmp/deposito/plan.txt')).toBe('/tmp/deposito')
  })

  it('en la raíz no se queda sin barra', () => {
    expect(fetchCarpetaDeLaRuta('/plan.txt')).toBe('/')
  })
})

describe('enviarPorTramos', () => {
  it('un archivo de 1 MB sale en cuatro tramos de 256 KB', async () => {
    const enviados: ArrayBuffer[] = []
    const socket = {
      readyState: WebSocket.OPEN,
      bufferedAmount: 0,
      send: (datos: ArrayBuffer) => enviados.push(datos),
    } as unknown as WebSocket

    await enviarPorTramos(socket, buildArchivo(1024 * 1024), {
      onAvance: () => {},
      sigueViva: () => true,
      pedirTurno: async () => {},
    })

    expect(enviados.map((tramo) => tramo.byteLength)).toEqual(Array(4).fill(256 * 1024))
  })

  it('parte el archivo y avisa de cada tramo', async () => {
    const socket = buildSocket()
    const avances: number[] = []

    await enviarPorTramos(socket, buildArchivo(TAMANO_DE_TRAMO + 10), {
      onAvance: (enviado) => avances.push(enviado),
      sigueViva: () => true,
      pedirTurno: async () => {},
    })

    const enviados = (socket as unknown as SocketDePrueba).enviados
    expect(enviados).toHaveLength(2)
    expect(enviados[0]?.byteLength).toBe(TAMANO_DE_TRAMO)
    expect(avances).toEqual([TAMANO_DE_TRAMO, TAMANO_DE_TRAMO + 10])
  })

  it('al cancelar deja de mandar tramos', async () => {
    const socket = buildSocket()
    let sigue = true

    const copia = enviarPorTramos(socket, buildArchivo(TAMANO_DE_TRAMO * 3), {
      onAvance: () => {
        sigue = false
      },
      sigueViva: () => sigue,
      pedirTurno: async () => {},
    })

    await expect(copia).rejects.toThrow(/cancel/)
    expect((socket as unknown as SocketDePrueba).enviados).toHaveLength(1)
  })

  it('con el socket caído no manda nada a ciegas', async () => {
    const socket = buildSocket(WebSocket.CLOSED)

    const copia = enviarPorTramos(socket, buildArchivo(10), {
      onAvance: () => {},
      sigueViva: () => true,
      pedirTurno: async () => {},
    })

    await expect(copia).rejects.toThrow(/conexión/)
  })
})
