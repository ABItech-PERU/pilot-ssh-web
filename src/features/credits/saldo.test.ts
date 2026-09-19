import { describe, expect, it } from 'vitest'

import {
  describirEstado,
  explicarPaquete,
  mejorPrecio,
  etiquetaDelPaquete,
  paqueteRecomendado,
  describirSaldo,
} from '@/features/credits/saldo'
import type { TopUpPackage, Wallet } from '@/types/api'

const saldo = (cambios: Partial<Wallet>): Wallet => ({
  organization: 'acme',
  balance: '1000.0000',
  state: 'ok',
  daily_burn: '0.00',
  days_left: null,
  grace_ends_at: null,
  has_free_allowance: true,
  online_payment: true,
  billing_time_zone: 'America/Lima',
  ...cambios,
})

const paquete = (bono: string): TopUpPackage => ({
  id: 'p',
  name: 'Recarga S/ 50',
  available_until: null,
  price_amount: '50.00',
  price_currency: 'PEN',
  credits: '5000.00',
  bonus_credits: bono,
  total_credits: String(5000 + Number(bono)),
  is_recommended: false,
})

describe('describirSaldo', () => {
  it('sin gasto no inventa cuánto dura', () => {
    expect(describirSaldo(saldo({}))).toEqual({
      detalle: 'Sin gasto en el último mes.',
      tono: 'normal',
    })
  })

  it('con gasto dice para cuántos días alcanza', () => {
    expect(describirSaldo(saldo({ days_left: 40 })).detalle).toBe(
      'Le alcanza para unos 40 días.',
    )
  })

  it('a una semana de acabarse avisa sin alarmar', () => {
    expect(describirSaldo(saldo({ state: 'low', days_left: 5 }))).toEqual({
      detalle: 'Le alcanza para unos 5 días. Recargue pronto.',
      tono: 'aviso',
    })
  })

  it('menos de un día no se redondea a cero: sonaría a que ya se acabó', () => {
    expect(describirSaldo(saldo({ state: 'low', days_left: 0 })).detalle).toBe(
      'Le alcanza para menos de un día. Recargue pronto.',
    )
  })

  it('en el margen dice hasta cuándo siguen abriéndose las terminales', () => {
    const { detalle, tono } = describirSaldo(
      saldo({ state: 'grace', balance: '-5', grace_ends_at: '2027-03-12T15:00:00Z' }),
    )

    expect(detalle).toBe(
      'Sin créditos. Las terminales siguen abriéndose hasta el 12 mar 2027.',
    )
    expect(tono).toBe('peligro')
  })

  it('agotado dice lo que todavía se puede hacer', () => {
    expect(describirSaldo(saldo({ state: 'exhausted', balance: '0' }))).toEqual({
      detalle: 'Sin créditos. Solo se abren las terminales gratuitas de cada día.',
      tono: 'peligro',
    })
  })

  it('sin el correo confirmado dice que no hay nada gratis, y por qué', () => {
    const { detalle } = describirSaldo(
      saldo({ state: 'empty', balance: '0', has_free_allowance: false }),
    )

    expect(detalle).toContain('confirmar el correo')
  })

  it('sin créditos desde siempre no alarma: nada se le ha cortado', () => {
    expect(describirSaldo(saldo({ state: 'empty', balance: '0' })).tono).toBe('normal')
  })
})

describe('explicarPaquete', () => {
  it('dice el total con el regalo dentro, de dónde sale y cuánto dura', () => {
    expect(explicarPaquete(paquete('500.00'), 110)).toEqual({
      total: '5500 créditos en total',
      desglose: '5000 del paquete + 500 de regalo',
      regalo: '+10 % de regalo',
      duracion: 'Le dura unos 50 días a su ritmo',
      hasta: null,
    })
  })

  it('lo largo lo dice en meses o en años, no en cientos de días', () => {
    expect(explicarPaquete(paquete('500.00'), 20).duracion).toContain('unos 9 meses')
    expect(explicarPaquete(paquete('500.00'), 5).duracion).toContain('unos 3 años')
  })

  it('sin regalo ni gasto no inventa nada', () => {
    expect(explicarPaquete(paquete('0.00'), 0)).toEqual({
      total: '5000 créditos en total',
      desglose: null,
      regalo: null,
      duracion: null,
      hasta: null,
    })
  })

  it('una oferta con fecha mete prisa; sin fecha, no', () => {
    const conFin = { ...paquete('500.00'), available_until: '2026-05-10T23:59:59Z' }
    expect(explicarPaquete(conFin, 0).hasta).toContain('Solo hasta el')
    expect(explicarPaquete(paquete('500.00'), 0).hasta).toBeNull()
  })
})

describe('mejorPrecio', () => {
  const con = (id: string, precio: string, total: string): TopUpPackage => ({
    ...paquete('0.00'),
    id,
    price_amount: precio,
    total_credits: total,
  })

  it('señala al que da más créditos por sol', () => {
    expect(
      mejorPrecio([
        con('a', '20', '2000'),
        con('b', '50', '5500'),
        con('c', '100', '12000'),
      ]),
    ).toBe('c')
  })

  it('no señala a nadie si empatan o hay uno solo', () => {
    expect(mejorPrecio([con('a', '20', '2000'), con('b', '40', '4000')])).toBeNull()
    expect(mejorPrecio([con('a', '20', '2000')])).toBeNull()
  })
})

describe('describirEstado', () => {
  it('colorea lo que pide hacer algo', () => {
    expect(describirEstado('ok')).toEqual({ etiqueta: 'Con saldo', tono: 'normal' })
    expect(describirEstado('low')).toEqual({ etiqueta: 'Queda poco', tono: 'aviso' })
    expect(describirEstado('grace').tono).toBe('peligro')
    expect(describirEstado('exhausted').tono).toBe('peligro')
    expect(describirEstado('empty')).toEqual({ etiqueta: 'Sin créditos', tono: 'normal' })
  })
})

describe('paqueteRecomendado', () => {
  const con = (id: string, bono: string, recomendado = false): TopUpPackage => ({
    ...paquete(bono),
    id,
    is_recommended: recomendado,
  })

  it('manda el que marcó finanzas', () => {
    expect(
      paqueteRecomendado([con('a', '0'), con('b', '500'), con('c', '2000', true)])?.id,
    ).toBe('c')
  })

  it('sin marca, el primero con regalo; sin regalo, el primero', () => {
    expect(
      paqueteRecomendado([con('a', '0'), con('b', '500'), con('c', '2000')])?.id,
    ).toBe('b')
    expect(paqueteRecomendado([con('a', '0'), con('b', '0')])?.id).toBe('a')
    expect(paqueteRecomendado([])).toBeUndefined()
  })
})

describe('etiquetaDelPaquete', () => {
  const con = (name: string, price_amount: string) => ({
    ...paquete('0.00'),
    name,
    price_amount,
  })

  it('un nombre de campaña se enseña tal cual', () => {
    expect(etiquetaDelPaquete(con('Regalo Navidad', '25.00'))).toBe('Regalo Navidad')
    expect(etiquetaDelPaquete(con('Día de madre', '70.00'))).toBe('Día de madre')
  })

  it('sin repetir el precio, que va al otro extremo', () => {
    expect(etiquetaDelPaquete(con('Recarga S/ 50', '50.00'))).toBe('Recarga')
    expect(etiquetaDelPaquete(con('Recarga 100', '100.00'))).toBe('Recarga')
  })

  it('si no queda nada, la ficha no se queda sin etiqueta', () => {
    expect(etiquetaDelPaquete(con('S/ 25', '25.00'))).toBe('Recarga')
  })
})
