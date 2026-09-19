import { describe, expect, it } from 'vitest'

import {
  describirCobro,
  esperaCobroPorFuera,
  seResuelveAMano,
} from '@/features/backoffice/recargas'
import type { PlatformTopUp } from '@/types/api'

type Recarga = Pick<
  PlatformTopUp,
  'status' | 'external_id' | 'gateway' | 'payment_method' | 'payment_brand'
>

const recarga = (cambios: Partial<Recarga>): Recarga => ({
  status: 'pending',
  external_id: '',
  gateway: '',
  payment_method: '',
  payment_brand: '',
  ...cambios,
})

describe('seResuelveAMano', () => {
  it('una pedida sin pago en línea se acredita o se cancela a mano', () => {
    expect(seResuelveAMano(recarga({}))).toBe(true)
    expect(seResuelveAMano(recarga({ gateway: 'mercadopago' }))).toBe(true)
  })

  it('con pago en línea la cierra el proveedor', () => {
    expect(seResuelveAMano(recarga({ external_id: 'ORD01' }))).toBe(false)
  })

  it('lo que ya no está pendiente no se toca', () => {
    expect(seResuelveAMano(recarga({ status: 'completed' }))).toBe(false)
    expect(seResuelveAMano(recarga({ status: 'cancelled' }))).toBe(false)
  })
})

describe('esperaCobroPorFuera', () => {
  it('solo la pedida sin pasarela pide acción desde la fila', () => {
    expect(esperaCobroPorFuera(recarga({}))).toBe(true)
  })

  it('una abandonada en línea no tiene nada que acreditar', () => {
    expect(esperaCobroPorFuera(recarga({ gateway: 'mercadopago' }))).toBe(false)
  })
})

describe('describirCobro', () => {
  it('con referencia de pago, nombra la pasarela y con qué se pagó', () => {
    expect(
      describirCobro(
        recarga({
          status: 'completed',
          external_id: 'ORD01',
          gateway: 'mercadopago',
          payment_method: 'credit_card',
          payment_brand: 'visa',
        }),
      ),
    ).toEqual({
      medio: 'pasarela',
      etiqueta: 'Mercado Pago',
      detalle: 'Tarjeta de crédito · Visa',
    })
    expect(
      describirCobro(
        recarga({ external_id: 'ORD02', gateway: 'mercadopago', payment_method: 'yape' }),
      ).detalle,
    ).toBe('Yape')
  })

  it('una de antes de guardar el medio no inventa nada', () => {
    expect(
      describirCobro(recarga({ external_id: 'ORD01', gateway: 'mercadopago' })).detalle,
    ).toBeNull()
  })

  it('una acreditada sin referencia de pago se cobró por fuera, con su medio', () => {
    expect(
      describirCobro(
        recarga({
          status: 'completed',
          gateway: 'mercadopago',
          payment_method: 'transfer',
        }),
      ),
    ).toEqual({ medio: 'por-fuera', etiqueta: 'Por fuera', detalle: 'Transferencia' })
    expect(
      describirCobro(recarga({ status: 'completed', payment_method: 'cash' })).detalle,
    ).toBe('Efectivo')
  })

  it('la operación no entra: tiene su columna y aquí se cortaba', () => {
    expect(describirCobro(recarga({ status: 'completed' })).detalle).toBeNull()
  })

  it('abrir el formulario y no pagar es la pasarela sin pago, no un cobro pendiente', () => {
    expect(describirCobro(recarga({ gateway: 'mercadopago' }))).toEqual({
      medio: 'sin-pagar',
      etiqueta: 'Mercado Pago',
      detalle: 'Pago sin terminar',
    })
  })

  it('la pedida sin pasarela espera el cobro de finanzas', () => {
    expect(describirCobro(recarga({}))).toEqual({
      medio: 'por-cobrar',
      etiqueta: 'Por fuera',
      detalle: 'Pendiente de cobro',
    })
    expect(describirCobro(recarga({ status: 'cancelled' }))).toEqual({
      medio: 'sin-cobrar',
      etiqueta: 'Por fuera',
      detalle: 'Sin cobrar',
    })
  })
})
