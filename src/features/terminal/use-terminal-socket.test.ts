import { act, renderHook, waitFor } from '@testing-library/react'
import type { Terminal } from '@xterm/xterm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TAMANO_DE_TRAMO } from '@/features/terminal/subida'
import type { ArchivoParaSubir } from '@/features/terminal/transferencias'
import { useTerminalSocket } from '@/features/terminal/use-terminal-socket'
import type { Server, ServerUser } from '@/types/api'

vi.mock('@/features/auth/api', () => ({
  requestSocketTicket: vi.fn(async () => 'vale'),
}))
vi.mock('@/features/servers/api', () => ({
  fetchServer: vi.fn(async () => ({})),
}))

/** Un WebSocket que la prueba abre, corta y hace contestar. */
class SocketFalso {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSING = 2
  static CLOSED = 3
  static creados: SocketFalso[] = []

  readyState = SocketFalso.CONNECTING
  /** Como el servidor, que contesta cada ping; en falso, la conexión está muerta. */
  contestaPings = true
  cerradoCon: number | undefined
  bufferedAmount = 0
  binaryType = 'blob'
  enviados: (string | ArrayBuffer)[] = []
  onopen: (() => void) | null = null
  onmessage: ((evento: { data: string }) => void) | null = null
  onclose: ((evento: { code: number }) => void) | null = null

  constructor(readonly url: string) {
    SocketFalso.creados.push(this)
  }

  send(datos: string | ArrayBuffer) {
    this.enviados.push(datos)
    if (typeof datos !== 'string' || !this.contestaPings) return
    const { ping } = JSON.parse(datos) as { ping?: number }
    if (ping !== undefined) queueMicrotask(() => this.contestar({ type: 'pong', ping }))
  }

  close(codigo?: number) {
    this.cerradoCon = codigo
    this.readyState = SocketFalso.CLOSED
  }

  abrir() {
    this.readyState = SocketFalso.OPEN
    this.onopen?.()
  }

  contestar(mensaje: object) {
    this.onmessage?.({ data: JSON.stringify(mensaje) })
  }

  cortar() {
    this.readyState = SocketFalso.CLOSED
    this.onclose?.({ code: 1006 })
  }

  get mensajes(): Record<string, unknown>[] {
    return this.enviados
      .filter((dato): dato is string => typeof dato === 'string')
      .map((dato) => JSON.parse(dato) as Record<string, unknown>)
  }

  /** Lo que la web pidió sobre subidas, sin los pings. */
  get subidas(): Record<string, unknown>[] {
    return this.enviados
      .filter((dato): dato is string => typeof dato === 'string')
      .map((dato) => JSON.parse(dato) as Record<string, unknown>)
      .filter((mensaje) => 'subida' in mensaje)
      .map((mensaje) => mensaje.subida as Record<string, unknown>)
  }

  get tramos(): ArrayBuffer[] {
    return this.enviados.filter((dato): dato is ArrayBuffer => typeof dato !== 'string')
  }
}

const vista = {
  write: vi.fn(),
  focus: vi.fn(),
  cols: 80,
  rows: 24,
  buffer: { active: { cursorX: 0, type: 'normal' } },
} as unknown as Terminal

/** Estables entre renders, como en la página, o el socket se reabriría. */
const OPCIONES = {
  server: { id: 'srv' } as Server,
  credencial: { id: 'cred', working_directory: '' } as ServerUser,
  terminal: { current: vista },
  onEstado: vi.fn(),
  onLatencia: vi.fn(),
}

function montar() {
  return renderHook(() => useTerminalSocket(OPCIONES))
}

async function conectar(posicion = 0) {
  await waitFor(() => expect(SocketFalso.creados[posicion]).toBeDefined(), {
    timeout: 3000,
  })
  const socket = SocketFalso.creados[posicion]!
  act(() => socket.abrir())
  return socket
}

const paraSubir = (nombre: string, bytes: number): ArchivoParaSubir => ({
  archivo: new File([new Uint8Array(bytes)], nombre),
  carpeta: '~',
  nombre,
  crearCarpeta: false,
})

beforeEach(() => {
  SocketFalso.creados = []
  vi.stubGlobal('WebSocket', SocketFalso)
})

afterEach(() => vi.unstubAllGlobals())

describe('useTerminalSocket, cola de subidas', () => {
  it('sube de a uno y anuncia el siguiente cuando termina el anterior', async () => {
    const { result } = montar()
    const socket = await conectar()

    act(() => {
      void result.current.encolarSubidas([paraSubir('a.txt', 5), paraSubir('b.txt', 3)])
    })
    await waitFor(() => expect(socket.subidas[0]).toMatchObject({ nombre: 'a.txt' }))
    expect(socket.subidas).toHaveLength(1)

    act(() =>
      socket.contestar({ type: 'subida', estado: 'preparada', ruta: '/home/a.txt' }),
    )
    await waitFor(() => expect(socket.subidas.at(-1)).toEqual({ fin: true }))
    act(() =>
      socket.contestar({ type: 'subida', estado: 'guardada', ruta: '/home/a.txt' }),
    )

    await waitFor(() => expect(socket.subidas.at(-1)).toMatchObject({ nombre: 'b.txt' }))
    expect(result.current.transferencias.map((una) => una.estado)).toEqual([
      'lista',
      'subiendo',
    ])
  })

  it('si ya existe, pregunta y vuelve a anunciar con lo elegido', async () => {
    const { result } = montar()
    const socket = await conectar()

    act(() => {
      void result.current.encolarSubidas([paraSubir('notas.txt', 4)])
    })
    await waitFor(() => expect(socket.subidas).toHaveLength(1))
    act(() =>
      socket.contestar({ type: 'subida', estado: 'existe', ruta: '/home/notas.txt' }),
    )

    await waitFor(() =>
      expect(result.current.conflicto).toEqual({
        nombre: 'notas.txt',
        carpeta: '/home',
        quedan: 0,
      }),
    )
    act(() => result.current.decidirConflicto('renombrar', false))

    await waitFor(() =>
      expect(socket.subidas.at(-1)).toMatchObject({ si_existe: 'renombrar' }),
    )
  })

  it('un corte de red no la pierde: al volver sigue desde lo que llegó', async () => {
    const { result } = montar()
    const socket = await conectar()
    const tramos = 8

    act(() => {
      void result.current.encolarSubidas([
        paraSubir('grande.bin', tramos * TAMANO_DE_TRAMO),
      ])
    })
    await waitFor(() => expect(socket.subidas).toHaveLength(1))
    act(() =>
      socket.contestar({ type: 'subida', estado: 'preparada', ruta: '/home/grande.bin' }),
    )
    // Seis tramos salen sin confirmar; el séptimo espera su turno
    await waitFor(() => expect(socket.tramos).toHaveLength(6))
    act(() => {
      socket.contestar({ type: 'subida', estado: 'sigue' })
      socket.contestar({ type: 'subida', estado: 'sigue' })
    })
    await waitFor(() => expect(socket.tramos).toHaveLength(8))
    act(() => socket.cortar())

    await waitFor(() =>
      expect(result.current.transferencias[0]).toMatchObject({
        estado: 'en-cola',
        retomar: true,
      }),
    )
    const vuelta = await conectar(1)
    await waitFor(() => expect(vuelta.subidas[0]).toEqual({ retomar: true }), {
      timeout: 3000,
    })
    act(() =>
      vuelta.contestar({
        type: 'subida',
        estado: 'retomada',
        enviado: 5 * TAMANO_DE_TRAMO,
      }),
    )

    // Solo lo que falta, y luego el cierre
    await waitFor(() => expect(vuelta.subidas.at(-1)).toEqual({ fin: true }))
    expect(vuelta.tramos).toHaveLength(3)
  })
})

describe('useTerminalSocket, conexión viva', () => {
  const volverALaPestana = () =>
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    OPCIONES.onEstado.mockClear()
    vi.mocked(vista.write).mockClear()
  })

  afterEach(() => vi.useRealTimers())

  it('contesta el latido del servidor al recibirlo', async () => {
    montar()
    const socket = await conectar()

    act(() => socket.contestar({ type: 'latido' }))

    expect(socket.mensajes).toContainEqual({ latido: true })
  })

  it('al volver a la pestaña, una conexión que no contesta se rehace sobre la misma shell', async () => {
    montar()
    const socket = await conectar()
    act(() => socket.contestar({ type: 'sesion', id: 'shell-1' }))
    socket.contestaPings = false

    volverALaPestana()
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(socket.cerradoCon).toBe(4000)
    expect(OPCIONES.onEstado).toHaveBeenCalledWith({ fase: 'reconectando' })
    await waitFor(() => expect(SocketFalso.creados[1]).toBeDefined(), { timeout: 3000 })
    expect(SocketFalso.creados[1]!.url).toContain('sesion=shell-1')
  })

  it('al volver a la pestaña, si contesta, sigue con la misma conexión', async () => {
    montar()
    const socket = await conectar()

    volverALaPestana()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })

    expect(socket.cerradoCon).toBeUndefined()
    expect(SocketFalso.creados).toHaveLength(1)
  })

  it('un corte no ensucia la terminal: lo dice el estado', async () => {
    montar()
    const socket = await conectar()

    act(() => socket.cortar())
    expect(OPCIONES.onEstado).toHaveBeenCalledWith({ fase: 'reconectando' })
    await conectar(1)

    const escrito = vi.mocked(vista.write).mock.calls.map(([texto]) => String(texto)).join('')
    expect(escrito).not.toMatch(/Se perdió|Reconectado/)
    expect(OPCIONES.onEstado).toHaveBeenLastCalledWith({ fase: 'conectada' })
  })
})
