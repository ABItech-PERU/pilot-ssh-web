import { describe, expect, it } from 'vitest'

import { buildCredentialPath } from '@/features/credentials/paths'

describe('buildCredentialPath', () => {
  it('lleva a la casa de la credencial', () => {
    expect(buildCredentialPath('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(
      '/app/credentials/0f8fad5b-d9cb-469f-a165-70867728950e',
    )
  })
})
