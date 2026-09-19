import { describe, expect, it } from 'vitest'

import { describirGratuito } from '@/features/credits/tarifas'
import type { PricedResource, PricingRule } from '@/types/api'

const tarifa = (
  resource: PricedResource,
  precio: string,
  gratis: number,
): PricingRule => ({
  resource,
  resource_label: '',
  credits_per_day: precio,
  free_allowance: gratis,
})

describe('describirGratuito', () => {
  it('dice lo gratuito con sus números, en el orden de siempre', () => {
    expect(describirGratuito([tarifa('server', '3', 2), tarifa('member', '5', 1)])).toBe(
      '1 persona y 2 servidores',
    )
  })

  it('sin nada gratis no promete nada', () => {
    expect(describirGratuito([tarifa('member', '5', 0)])).toBeNull()
  })
})
