import { describe, expect, it } from 'vitest'

import { hasInAppHistory } from '@/lib/history'

describe('hasInAppHistory', () => {
  it('hay historial cuando el indice del router es mayor que cero', () => {
    expect(hasInAppHistory({ idx: 3 })).toBe(true)
  })

  it('un enlace directo o una pestana nueva no tienen a donde volver', () => {
    expect(hasInAppHistory({ idx: 0 })).toBe(false)
    expect(hasInAppHistory(null)).toBe(false)
    expect(hasInAppHistory(undefined)).toBe(false)
    expect(hasInAppHistory({ otro: 1 })).toBe(false)
  })
})
