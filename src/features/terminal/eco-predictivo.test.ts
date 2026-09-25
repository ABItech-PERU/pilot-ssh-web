import { beforeEach, describe, expect, it } from 'vitest'

import {
  crearEcoPredictivo,
  type EcoPredictivo,
  type VistaDeTerminal,
} from '@/features/terminal/eco-predictivo'

const VISTA: VistaDeTerminal = { cols: 80, cursorX: 10, enPantallaAlterna: false }
const BORRAR = '\b \b'

let eco: EcoPredictivo

beforeEach(() => {
  eco = crearEcoPredictivo()
  eco.activar(true)
})

describe('predecir', () => {
  it('pinta la letra igual que lo hará el servidor', () => {
    expect(eco.predecir('a', VISTA)).toBe('a')
    expect(eco.hayPendiente).toBe(true)
  })

  it('con la respuesta rápida no adivina nada', () => {
    eco.activar(false)

    expect(eco.predecir('a', VISTA)).toBe('')
    expect(eco.hayPendiente).toBe(false)
  })

  it('en vim o htop no adivina: descuadraría la pantalla', () => {
    expect(eco.predecir('a', { ...VISTA, enPantallaAlterna: true })).toBe('')
  })

  it('las teclas que no escriben retiran lo predicho', () => {
    eco.predecir('a', VISTA)

    expect(eco.predecir('\r', VISTA)).toBe(BORRAR)
    expect(eco.hayPendiente).toBe(false)
  })

  it('el borrado también retira lo predicho', () => {
    eco.predecir('a', VISTA)

    expect(eco.predecir('\x7f', VISTA)).toBe(BORRAR)
  })

  it('junto al borde no adivina: no podría borrarlo', () => {
    eco.predecir('a', VISTA)

    expect(eco.predecir('b', { ...VISTA, cursorX: 79 })).toBe(BORRAR)
  })

  it('deja de adivinar cuando se acumula demasiado', () => {
    for (const letra of 'abcdefghijklmnopqrstuvwx') eco.predecir(letra, VISTA)

    expect(eco.predecir('y', VISTA)).toBe('')
  })
})

describe('reconciliar', () => {
  it('borra lo predicho antes de pintar lo que llega', () => {
    eco.predecir('l', VISTA)
    eco.predecir('s', VISTA)

    expect(eco.reconciliar('ls')).toBe(BORRAR.repeat(2) + 'ls')
    expect(eco.hayPendiente).toBe(false)
  })

  it('sin nada predicho, la salida pasa tal cual', () => {
    expect(eco.reconciliar('total 24')).toBe('total 24')
  })
})

describe('limpiar', () => {
  it('deja la pantalla como la dejó el servidor', () => {
    eco.predecir('a', VISTA)

    expect(eco.limpiar()).toBe(BORRAR)
    expect(eco.limpiar()).toBe('')
  })
})
