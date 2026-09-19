import { describe, expect, it } from 'vitest'

import { repartir } from '@/features/backoffice/resumen'

describe('repartir', () => {
  it('reparte por dinero, no por cantidad de recargas', () => {
    const partes = repartir([
      { method: 'yape', label: 'Yape', count: 10, amount: '200.00', credits: '20000.00' },
      {
        method: 'credit_card',
        label: 'Tarjeta',
        count: 2,
        amount: '200.00',
        credits: '24000.00',
      },
    ])

    expect(partes.map((medio) => medio.parte)).toEqual([0.5, 0.5])
  })

  it('sin dinero no hay partes que repartir', () => {
    expect(
      repartir([
        { method: '', label: 'Sin registrar', count: 0, amount: '0', credits: '0' },
      ]).map((medio) => medio.parte),
    ).toEqual([0])
    expect(repartir([])).toEqual([])
  })
})
