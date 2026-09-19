import { describe, expect, it } from 'vitest'

import {
  describirIntentos,
  describirProximoIntento,
  formatearDuracion,
  remedioDelCorreo,
  sePuedeReprocesar,
} from '@/features/backoffice/operaciones'

describe('describirIntentos', () => {
  it('con uno no dice nada', () => {
    expect(describirIntentos(1)).toBe('')
    expect(describirIntentos(0)).toBe('')
  })

  it('con varios los cuenta', () => {
    expect(describirIntentos(4)).toBe('4 intentos')
  })
})

describe('describirProximoIntento', () => {
  const ahora = Date.parse('2026-09-16T12:00:00Z')

  it('vencido, espera su vuelta en la cola', () => {
    expect(describirProximoIntento('2026-09-16T11:56:00Z', ahora)).toBe(
      'En cola para procesarse',
    )
  })

  it('por venir, dice cuándo', () => {
    const dentroDeDiezMinutos = new Date(Date.now() + 10 * 60_000).toISOString()
    expect(describirProximoIntento(dentroDeDiezMinutos)).toBe(
      'Reintenta dentro de 10 min',
    )
  })
})

describe('sePuedeReprocesar', () => {
  it('solo lo fallido o ignorado', () => {
    expect(sePuedeReprocesar({ status: 'failed' })).toBe(true)
    expect(sePuedeReprocesar({ status: 'ignored' })).toBe(true)
    expect(sePuedeReprocesar({ status: 'processed' })).toBe(false)
    expect(sePuedeReprocesar({ status: 'pending' })).toBe(false)
  })
})

describe('formatearDuracion', () => {
  it('en segundos lo corto y en minutos lo largo', () => {
    expect(formatearDuracion(0.4)).toBe('0,4 s')
    expect(formatearDuracion(59)).toBe('59 s')
    expect(formatearDuracion(125)).toBe('2 min 5 s')
    expect(formatearDuracion(120)).toBe('2 min')
  })

  it('sin terminar no inventa una duración', () => {
    expect(formatearDuracion(null)).toBe('—')
  })
})

describe('remedioDelCorreo', () => {
  it('lleva a la acción que lo vuelve a mandar', () => {
    expect(remedioDelCorreo('contrasena_olvidada')).toContain('desde su cuenta')
    expect(remedioDelCorreo('codigo_de_acceso')).toContain('código nuevo')
  })

  it('lo que solo avisa no se reenvía', () => {
    expect(remedioDelCorreo('sesion_nueva')).toContain('no hace falta reenviarlo')
  })
})
