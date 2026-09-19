import { describe, expect, it } from 'vitest'

import { formatearDia, resolverPeriodo } from '@/lib/periods'

// Un jueves, para que «esta semana» tenga días por delante y por detrás
const JUEVES = new Date(2026, 8, 10)

describe('resolverPeriodo', () => {
  it('«hoy» y «ayer» son un solo día, no un rango abierto', () => {
    expect(resolverPeriodo('hoy', JUEVES)).toEqual({
      from: '2026-09-10',
      to: '2026-09-10',
    })
    expect(resolverPeriodo('ayer', JUEVES)).toEqual({
      from: '2026-09-09',
      to: '2026-09-09',
    })
  })

  it('la semana empieza el lunes, que aquí no empieza en domingo', () => {
    expect(resolverPeriodo('semana', JUEVES)?.from).toBe('2026-09-07')
  })

  it('el mes anterior termina en su último día, sea 28, 30 o 31', () => {
    expect(resolverPeriodo('mes-anterior', new Date(2026, 2, 15))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('el año pasado es el año entero, no hasta hoy', () => {
    expect(resolverPeriodo('ano-pasado', JUEVES)).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    })
  })

  it('«personalizado» no resuelve nada: lo escribe quien lo elige', () => {
    expect(resolverPeriodo('personalizado', JUEVES)).toBeNull()
  })
})

describe('formatearDia', () => {
  it('usa el día de quien mira, no el de UTC', () => {
    // Las nueve de la noche en Lima ya es el día siguiente en UTC
    expect(formatearDia(new Date(2026, 8, 10, 21, 30))).toBe('2026-09-10')
  })
})
