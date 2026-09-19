import { afterEach, describe, expect, it } from 'vitest'

import { formatDateTime, formatDay } from '@/lib/format'
import { formatearDia, resolverPeriodo } from '@/lib/periods'
import {
  desfase,
  describirZona,
  fijarZona,
  ordenarPorDesfase,
  zonaActual,
  zonaDelNavegador,
} from '@/lib/zona-horaria'

afterEach(() => fijarZona(''))

// Las ocho de la noche del 10 en UTC: en Tokio ya es el 11
const NOCHE_EN_UTC = new Date('2026-09-10T20:00:00Z')
const ENERO = new Date('2026-01-15T12:00:00Z')
const JULIO = new Date('2026-07-15T12:00:00Z')

describe('desfase', () => {
  it('Lima va cinco horas por detrás todo el año', () => {
    expect(desfase('America/Lima', ENERO)).toBe('UTC-05:00')
    expect(desfase('America/Lima', JULIO)).toBe('UTC-05:00')
  })

  it('Madrid cambia con el horario de verano', () => {
    expect(desfase('Europe/Madrid', ENERO)).toBe('UTC+01:00')
    expect(desfase('Europe/Madrid', JULIO)).toBe('UTC+02:00')
  })

  it('UTC no lleva desfase', () => {
    expect(desfase('UTC')).toBe('UTC+00:00')
  })
})

describe('describirZona', () => {
  it('se lee como la conoce la gente, con la hora que es allí', () => {
    const lima = describirZona('America/Lima', ENERO)

    expect(lima.ciudad).toBe('Lima')
    expect(lima.region).toContain('Perú')
    expect(lima.hora).toBe('07:00')
  })

  it('las ciudades con nombre en español lo llevan', () => {
    expect(describirZona('Asia/Tokyo', ENERO).ciudad).toBe('Tokio')
    expect(describirZona('Europe/London', ENERO).ciudad).toBe('Londres')
    expect(describirZona('America/New_York', ENERO).ciudad).toBe('Nueva York')
  })

  it('las demás llevan espacios, no guiones bajos', () => {
    expect(describirZona('America/Costa_Rica', ENERO).ciudad).toBe('Costa Rica')
  })
})

describe('ordenarPorDesfase', () => {
  it('de oeste a este: las de la misma hora quedan juntas', () => {
    const orden = ordenarPorDesfase(
      ['Asia/Tokyo', 'America/Lima', 'UTC', 'America/Bogota'],
      ENERO,
    )

    expect(orden.map((zona) => zona.nombre)).toEqual([
      'America/Bogota',
      'America/Lima',
      'UTC',
      'Asia/Tokyo',
    ])
  })
})

describe('fijarZona', () => {
  it('sin zona en el perfil vuelve a la del navegador', () => {
    fijarZona('Asia/Tokyo')
    expect(zonaActual()).toBe('Asia/Tokyo')

    fijarZona('')
    expect(zonaActual()).toBe(zonaDelNavegador())
  })
})

describe('la zona del perfil manda', () => {
  it('las horas se leen en ella, no en la del equipo', () => {
    fijarZona('Asia/Tokyo')
    expect(formatDateTime(NOCHE_EN_UTC.toISOString())).toMatch(/^11 /)
  })

  it('los días se cortan en ella', () => {
    fijarZona('Asia/Tokyo')
    expect(formatearDia(NOCHE_EN_UTC)).toBe('2026-09-11')
    expect(resolverPeriodo('hoy', NOCHE_EN_UTC)).toEqual({
      from: '2026-09-11',
      to: '2026-09-11',
    })
  })

  it('un día del calendario no se corre en ninguna', () => {
    fijarZona('Pacific/Kiritimati')
    expect(formatDay('2026-03-12')).toMatch(/^12 /)
  })
})
