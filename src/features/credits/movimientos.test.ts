import { describe, expect, it } from 'vitest'

import { autorDe, conceptoDe, ladoDe, saldoAntes } from '@/features/credits/movimientos'

describe('ladoDe', () => {
  it('lo positivo entra y lo negativo sale', () => {
    expect(ladoDe({ kind: 'topup', amount: '5500.0000' })).toBe('entra')
    expect(ladoDe({ kind: 'consumption', amount: '-30.0000' })).toBe('sale')
  })

  it('una devolución se lee aparte, no como un gasto más', () => {
    expect(ladoDe({ kind: 'refund', amount: '-3300.0000' })).toBe('devuelve')
  })

  it('un ajuste se lee aparte, entre o salga', () => {
    expect(ladoDe({ kind: 'adjustment', amount: '10.0000' })).toBe('corrige')
    expect(ladoDe({ kind: 'adjustment', amount: '-10.0000' })).toBe('corrige')
  })
})

describe('autorDe', () => {
  it('firma solo lo que hizo alguien a mano', () => {
    expect(autorDe({ kind: 'grant', actor: 'Ana Quispe' })).toBe('Ana Quispe')
    expect(autorDe({ kind: 'consumption', actor: 'Ana Quispe' })).toBeNull()
    expect(autorDe({ kind: 'grant', actor: null })).toBeNull()
  })
})

describe('saldoAntes', () => {
  it('deshace el movimiento sobre el saldo que dejó', () => {
    expect(saldoAntes({ amount: '5500.00', balance_after: '66200.0000' })).toBe(60700)
    expect(saldoAntes({ amount: '-2200.00', balance_after: '3300.0000' })).toBe(5500)
  })
})

describe('conceptoDe', () => {
  it('sin descripción vale el tipo', () => {
    expect(conceptoDe({ description: '', kind_label: 'Bono de bienvenida' })).toBe(
      'Bono de bienvenida',
    )
    expect(conceptoDe({ description: 'Recarga S/ 50', kind_label: 'Recarga' })).toBe(
      'Recarga S/ 50',
    )
  })
})
