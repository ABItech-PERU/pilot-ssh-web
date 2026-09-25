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

  it('las teclas que mueven el cursor retiran lo predicho', () => {
    eco.predecir('a', VISTA)

    expect(eco.predecir('\x1b[A', VISTA)).toBe(BORRAR)
    expect(eco.hayPendiente).toBe(false)
  })

  it('al enviar la línea, lo adivinado se queda: el eco lo confirma', () => {
    eco.predecir('l', VISTA)
    eco.predecir('s', VISTA)

    expect(eco.predecir('\r', VISTA)).toBe('')
    expect(eco.hayPendiente).toBe(true)
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
  it('lo que confirma lo adivinado no se repinta', () => {
    eco.predecir('l', VISTA)
    eco.predecir('s', VISTA)

    expect(eco.reconciliar('ls')).toBe('')
    expect(eco.hayPendiente).toBe(false)
  })

  it('el eco partido en dos confirma de a poco', () => {
    eco.predecir('l', VISTA)
    eco.predecir('s', VISTA)

    expect(eco.reconciliar('l')).toBe('')
    expect(eco.hayPendiente).toBe(true)
    expect(eco.reconciliar('s')).toBe('')
    expect(eco.hayPendiente).toBe(false)
  })

  it('lo que el eco trae de más sí se pinta', () => {
    eco.predecir('l', VISTA)
    eco.predecir('s', VISTA)

    expect(eco.reconciliar('ls y su salida')).toBe(' y su salida')
  })

  it('si la shell escribe otra cosa, se borra lo adivinado', () => {
    eco.predecir('a', VISTA)

    expect(eco.reconciliar('zzz')).toBe(BORRAR + 'zzz')
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
