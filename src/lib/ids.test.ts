import { describe, expect, it } from 'vitest'

import { isUuid } from '@/lib/ids'

describe('isUuid', () => {
  it('acepta un uuid v4 en minusculas o mayusculas', () => {
    expect(isUuid('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(true)
    expect(isUuid('0F8FAD5B-D9CB-469F-A165-70867728950E')).toBe(true)
  })

  it('rechaza numeros, vacios y lo que no tiene forma de uuid', () => {
    expect(isUuid('5')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid('0f8fad5b-d9cb-469f-a165')).toBe(false)
  })
})
