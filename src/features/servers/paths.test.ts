import { describe, expect, it } from 'vitest'

import { buildServerPath } from '@/features/servers/paths'

const SERVIDOR = '0f8fad5b-d9cb-469f-a165-70867728950e'

describe('buildServerPath', () => {
  it('sin pestana lleva al resumen', () => {
    expect(buildServerPath(SERVIDOR)).toBe(`/app/servers/${SERVIDOR}`)
  })

  it('con pestana lleva directo a ella', () => {
    expect(buildServerPath(SERVIDOR, 'credentials')).toBe(
      `/app/servers/${SERVIDOR}/credentials`,
    )
  })
})
