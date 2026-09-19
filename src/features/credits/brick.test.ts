import { afterEach, describe, expect, it } from 'vitest'

import { buildSdkOptions, MARCADOR_DE_NONCE } from '@/features/credits/brick'

function ponerNonce(valor: string) {
  const meta = document.createElement('meta')
  meta.name = 'csp-nonce'
  meta.content = valor
  document.head.append(meta)
}

describe('buildSdkOptions', () => {
  afterEach(() => document.head.querySelector('meta[name="csp-nonce"]')?.remove())

  it('publicado, pasa al SDK el nonce que escribió nginx', () => {
    ponerNonce('9f86d081884c7d659a2feaa0c55ad015')
    expect(buildSdkOptions('es-PE')).toEqual({
      locale: 'es-PE',
      deviceProfileCspNonce: '9f86d081884c7d659a2feaa0c55ad015',
    })
  })

  it('en desarrollo el marcador no es un nonce', () => {
    ponerNonce(MARCADOR_DE_NONCE)
    expect(buildSdkOptions('es-PE')).toEqual({ locale: 'es-PE' })
  })
})
