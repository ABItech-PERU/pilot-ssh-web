import { describe, expect, it } from 'vitest'

import {
  buildInitialCommand,
  buildTerminalPath,
  buildTerminalUrl,
  CIERRE,
  describeClose,
  fetchEsperaDeReconexion,
  parseIncoming,
  quoteForShell,
  RECONEXION,
  reconnectsAutomatically,
} from '@/features/terminal/socket'

const SERVIDOR = '0f8fad5b-d9cb-469f-a165-70867728950e'
const CREDENCIAL = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

describe('buildTerminalUrl', () => {
  it('lleva el token en la query, que es lo unico que admite el handshake', () => {
    expect(buildTerminalUrl('ws://localhost:8000', SERVIDOR, CREDENCIAL, 'abc')).toBe(
      `ws://localhost:8000/ws/terminal/${SERVIDOR}/${CREDENCIAL}?token=abc`,
    )
  })

  it('un token con caracteres raros no rompe la URL', () => {
    expect(buildTerminalUrl('wss://x', SERVIDOR, CREDENCIAL, 'a+b/c=')).toContain(
      'token=a%2Bb%2Fc%3D',
    )
  })
})

describe('buildTerminalPath', () => {
  it('lleva la credencial en la query: es lo que decide con quien se entra', () => {
    expect(buildTerminalPath(SERVIDOR, CREDENCIAL)).toBe(
      `/app/servers/${SERVIDOR}/terminal?credential=${CREDENCIAL}`,
    )
  })
})

describe('describeClose', () => {
  it('un permiso denegado no invita a reintentar: no cambia pulsando otra vez', () => {
    expect(describeClose(CIERRE.SIN_PERMISO).reintentable).toBe(false)
  })

  it('sin créditos no invita a reintentar: hace falta recargar', () => {
    const cierre = describeClose(CIERRE.SIN_SALDO)
    expect(cierre.reintentable).toBe(false)
    expect(cierre.motivo).toContain('créditos')
  })

  it('la terminal cerrada por tiempo sí invita a abrir otra', () => {
    const cierre = describeClose(CIERRE.CADUCADA)
    expect(cierre.reintentable).toBe(true)
    expect(cierre.motivo).toContain('tiempo')
  })

  it('una sesion caducada manda a iniciar sesion, no a reintentar', () => {
    const cierre = describeClose(CIERRE.NO_AUTENTICADO)
    expect(cierre.reintentable).toBe(false)
    expect(cierre.motivo).toContain('iniciar sesión')
  })

  it('una organizacion suspendida lo dice, y no deja reintentar', () => {
    const cierre = describeClose(CIERRE.ORGANIZACION_SUSPENDIDA)
    expect(cierre.reintentable).toBe(false)
    expect(cierre.motivo).toContain('suspendida')
  })

  it('un cierre normal, el exit remoto, deja volver a conectar', () => {
    expect(describeClose(CIERRE.NORMAL).reintentable).toBe(true)
  })

  it('una caida de red se puede reintentar', () => {
    expect(describeClose(CIERRE.ANORMAL).reintentable).toBe(true)
  })

  it('ningun motivo ensena el numero del codigo', () => {
    for (const codigo of Object.values(CIERRE)) {
      expect(describeClose(codigo).motivo).not.toMatch(/\d{4}/)
    }
  })
})

describe('quoteForShell', () => {
  it('una ruta con espacios llega entera', () => {
    expect(quoteForShell('/home/ana/mi sitio')).toBe("'/home/ana/mi sitio'")
  })

  it('una comilla simple dentro se escapa sin romper la cadena', () => {
    expect(quoteForShell("/home/o'brien")).toBe("'/home/o'\\''brien'")
  })
})

describe('buildInitialCommand', () => {
  it('sin ruta no teclea nada', () => {
    expect(buildInitialCommand('   ')).toBeNull()
  })

  it('con ruta hace cd y pulsa Enter', () => {
    expect(buildInitialCommand('/home/deploy/htdocs')).toBe("cd '/home/deploy/htdocs'\r")
  })
})

describe('parseIncoming', () => {
  it('lee la salida del servidor', () => {
    expect(parseIncoming('{"type":"output","message":"hola"}')).toEqual({
      type: 'output',
      message: 'hola',
    })
  })

  it('un tipo desconocido se trata como salida, no se pierde', () => {
    expect(parseIncoming('{"type":"raro","message":"x"}')?.type).toBe('output')
  })

  it('un marco que no es JSON se ignora en vez de romper la terminal', () => {
    expect(parseIncoming('esto no es json')).toBeNull()
  })

  it('sin message no hay nada que pintar', () => {
    expect(parseIncoming('{"type":"output"}')).toBeNull()
  })
})

describe('buildTerminalUrl con sesión', () => {
  it('lleva la sesión que se retoma', () => {
    expect(
      buildTerminalUrl('ws://x', SERVIDOR, CREDENCIAL, 'abc', 'se-sion-1'),
    ).toContain('&sesion=se-sion-1')
  })

  it('sin sesión, no la nombra', () => {
    expect(buildTerminalUrl('ws://x', SERVIDOR, CREDENCIAL, 'abc')).not.toContain(
      'sesion=',
    )
  })
})

describe('parseIncoming del id de sesión', () => {
  it('reconoce el id con el que se vuelve a la shell', () => {
    expect(parseIncoming('{"type":"sesion","id":"abc"}')).toEqual({
      type: 'sesion',
      id: 'abc',
    })
  })

  it('sin id no es un mensaje de sesión', () => {
    expect(parseIncoming('{"type":"sesion"}')).toBeNull()
  })
})

describe('fetchEsperaDeReconexion', () => {
  it('dobla la espera y se detiene en el tope', () => {
    expect(fetchEsperaDeReconexion(0)).toBe(RECONEXION.esperaBaseMs)
    expect(fetchEsperaDeReconexion(1)).toBe(RECONEXION.esperaBaseMs * 2)
    expect(fetchEsperaDeReconexion(20)).toBe(RECONEXION.esperaMaximaMs)
  })
})

describe('reconnectsAutomatically', () => {
  it('un relevo de versión reconecta solo y lo dice', () => {
    expect(reconnectsAutomatically(CIERRE.REINICIO, 0)).toBe(true)
    expect(describeClose(CIERRE.REINICIO).motivo).toContain('Reconectando')
  })

  it('deja de intentarlo tras unos pocos intentos', () => {
    expect(reconnectsAutomatically(CIERRE.REINICIO, RECONEXION.intentos)).toBe(false)
  })

  it('un corte de red vuelve solo: la shell sigue viva', () => {
    expect(reconnectsAutomatically(CIERRE.ANORMAL, 0)).toBe(true)
    expect(reconnectsAutomatically(CIERRE.SERVIDOR, 0)).toBe(true)
  })

  it('lo que decide la persona o el permiso no vuelve solo', () => {
    for (const codigo of [CIERRE.NORMAL, CIERRE.SIN_PERMISO, CIERRE.SIN_SALDO]) {
      expect(reconnectsAutomatically(codigo, 0)).toBe(false)
    }
  })
})
