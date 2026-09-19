import { describe, expect, it } from 'vitest'

import {
  construirSerie,
  construirSerieDelRango,
  describirDia,
  resumirMes,
} from '@/features/credits/uso'
import type { DailyUsage } from '@/types/api'

const hoy = new Date('2026-09-10T15:00:00Z')

const fila = (
  fecha: string,
  creditos: string,
  personas = 2,
  servidores = 1,
): DailyUsage => ({
  usage_date: fecha,
  members_used: personas,
  servers_used: servidores,
  members_billed: 0,
  servers_billed: 0,
  credits_charged: creditos,
})

describe('construirSerie', () => {
  it('pinta los 30 días que terminan ayer, también los que no tuvieron uso', () => {
    const serie = construirSerie([fila('2026-09-09', '10.0000')], hoy, 'UTC')

    expect(serie).toHaveLength(30)
    expect(serie.at(-1)).toMatchObject({ fecha: '2026-09-09', creditos: 10, usado: true })
    expect(serie[0]).toMatchObject({ fecha: '2026-08-11', creditos: 0, usado: false })
  })

  it('cuenta los días en la zona de cobro, como el servidor', () => {
    // La 01:00 del 11 en UTC son las 20:00 del 10 en Lima: ayer es el 9
    const serie = construirSerie([], new Date('2026-09-11T01:00:00Z'), 'America/Lima')

    expect(serie.at(-1)?.fecha).toBe('2026-09-09')
  })
})

describe('resumirMes', () => {
  it('suma solo lo del mes en curso', () => {
    const uso = [
      fila('2026-09-09', '10'),
      fila('2026-09-02', '5'),
      fila('2026-08-31', '99'),
    ]

    expect(resumirMes(uso, hoy, 'UTC')).toEqual({ creditos: 15, dias: 2 })
  })
})

describe('describirDia', () => {
  const [dia] = construirSerie(
    [fila('2026-03-12', '10')],
    new Date('2026-03-13T15:00:00Z'),
    'UTC',
    1,
  )

  it('dice quién usó y lo que costó', () => {
    expect(describirDia(dia!)).toBe('12 mar: 2 personas y 1 servidor · 10 créditos')
  })

  it('lo que cupo en lo gratuito se dice gratis, no cero créditos', () => {
    expect(describirDia({ ...dia!, creditos: 0, personas: 1 })).toBe(
      '12 mar: 1 persona y 1 servidor · gratis',
    )
  })

  it('un día sin terminales lo dice', () => {
    expect(describirDia({ ...dia!, usado: false })).toBe('12 mar: sin uso')
  })
})

describe('construirSerieDelRango', () => {
  it('con menos de tres meses es una barra por día', () => {
    const serie = construirSerieDelRango(
      [fila('2026-09-02', '5')],
      { from: '2026-09-01', to: '2026-09-03' },
      hoy,
      'UTC',
    )

    expect(serie.barras.map((barra) => barra.clave)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ])
    expect(serie.barras[1]).toMatchObject({ creditos: 5, usado: true })
    expect(serie).toMatchObject({ desde: '1 sept', hasta: '3 sept' })
  })

  it('pasados tres meses agrupa por mes y cuenta los días con uso', () => {
    const serie = construirSerieDelRango(
      [fila('2026-03-12', '10'), fila('2026-03-20', '5'), fila('2026-06-01', '0')],
      { from: '2026-03-01', to: '2026-06-30' },
      hoy,
      'UTC',
    )

    expect(serie.barras.map((barra) => barra.clave)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ])
    expect(serie.barras[0]?.etiqueta).toBe('mar 2026: 2 días con uso · 15 créditos')
    expect(serie.barras[3]).toMatchObject({ creditos: 0, usado: true })
    expect(serie.barras[1]?.etiqueta).toBe('abr 2026: sin uso')
  })

  it('un rango abierto se cierra con el primer día con uso y con ayer', () => {
    const serie = construirSerieDelRango(
      [fila('2026-09-05', '1')],
      { from: '', to: '' },
      hoy,
      'UTC',
    )

    expect(serie.barras[0]?.clave).toBe('2026-09-05')
    expect(serie.barras.at(-1)?.clave).toBe('2026-09-09')
  })
})
