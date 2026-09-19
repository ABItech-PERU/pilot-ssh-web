import { describe, expect, it } from 'vitest'

import { describirMetodo, nombreDelMetodo } from '@/features/credits/metodos'

describe('nombreDelMetodo', () => {
  it('cada medio con su nombre, y «Sin registrar» para lo de antes', () => {
    expect(nombreDelMetodo('yape')).toBe('Yape')
    expect(nombreDelMetodo('credit_card')).toBe('Tarjeta de crédito')
    expect(nombreDelMetodo('')).toBe('Sin registrar')
  })
})

describe('describirMetodo', () => {
  it('en las tarjetas añade la marca, con su nombre comercial', () => {
    expect(
      describirMetodo({ payment_method: 'credit_card', payment_brand: 'visa' }),
    ).toBe('Tarjeta de crédito · Visa')
    expect(
      describirMetodo({ payment_method: 'debit_card', payment_brand: 'debmaster' }),
    ).toBe('Tarjeta de débito · Mastercard')
    expect(
      describirMetodo({ payment_method: 'credit_card', payment_brand: 'cencosud' }),
    ).toBe('Tarjeta de crédito · Cencosud')
  })

  it('en una billetera o un ticket la marca repite el medio y no se pone', () => {
    expect(describirMetodo({ payment_method: 'yape', payment_brand: 'yape' })).toBe(
      'Yape',
    )
    expect(
      describirMetodo({
        payment_method: 'pagoefectivo',
        payment_brand: 'pagoefectivo_atm',
      }),
    ).toBe('PagoEfectivo')
  })

  it('sin medio no dice nada', () => {
    expect(describirMetodo({ payment_method: '', payment_brand: '' })).toBeNull()
  })
})
