import { describe, expect, it } from 'vitest'

import {
  enviarPorTramos,
  fetchPorcentaje,
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

describe('fetchPorcentaje', () => {
  it('cuenta lo que ya salió', () => {
    expect(fetchPorcentaje({ nombre: 'x', enviado: 25, total: 100 })).toBe(25)
  })

  it('un archivo vacío no divide entre cero', () => {
    expect(fetchPorcentaje({ nombre: 'x', enviado: 0, total: 0 })).toBe(0)
  })
})

describe('enviarPorTramos', () => {
  it('parte el archivo y avisa de cada tramo', async () => {
    const socket = buildSocket()
    const avances: number[] = []

    await enviarPorTramos(socket, buildArchivo(TAMANO_DE_TRAMO + 10), (enviado) =>
      avances.push(enviado),
    )

    const enviados = (socket as unknown as SocketDePrueba).enviados
    expect(enviados).toHaveLength(2)
    expect(enviados[0]?.byteLength).toBe(TAMANO_DE_TRAMO)
    expect(avances).toEqual([TAMANO_DE_TRAMO, TAMANO_DE_TRAMO + 10])
  })

  it('al cancelar deja de mandar tramos', async () => {
    const socket = buildSocket()
    let sigue = true

    const copia = enviarPorTramos(
      socket,
      buildArchivo(TAMANO_DE_TRAMO * 3),
      () => {
        sigue = false
      },
      () => sigue,
    )

    await expect(copia).rejects.toThrow(/cancel/)
    expect((socket as unknown as SocketDePrueba).enviados).toHaveLength(1)
  })

  it('con el socket caído no manda nada a ciegas', async () => {
    const socket = buildSocket(WebSocket.CLOSED)

    await expect(enviarPorTramos(socket, buildArchivo(10), () => {})).rejects.toThrow(
      /conexión/,
    )
  })
})
