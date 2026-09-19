import { describe, expect, it } from 'vitest'

import { describirAlcance } from '@/features/access/scope'
import type { AccessGrant } from '@/types/api'

function concesion(extra: Partial<AccessGrant> = {}): AccessGrant {
  return {
    id: 'g1',
    organization: 'o1',
    group: null,
    user: 'u1',
    invitation: null,
    is_pending: false,
    subject_type: 'user',
    subject_name: 'Elena Vargas',
    subject_email: 'elena@freelance.pe',
    server: null,
    server_name: null,
    server_user: null,
    label_key: '',
    label_value: '',
    scope: 'server',
    scope_label: 'Web PRD',
    level: 'connect',
    expires_at: null,
    is_expired: false,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  }
}

describe('describirAlcance', () => {
  it('la organización entera se dice, no se nombra', () => {
    const alcance = describirAlcance(
      concesion({ scope: 'organization', scope_label: 'Acme SRL' }),
    )

    expect(alcance).toBe('Toda la organización')
  })

  it('una etiqueta se nombra sola: el icono ya dice que lo es', () => {
    const alcance = describirAlcance(
      concesion({ scope: 'label', scope_label: 'Entorno: Producción' }),
    )

    expect(alcance).toBe('Entorno: Producción')
  })

  it('una credencial se nombra sola, con su llave delante', () => {
    const alcance = describirAlcance(
      concesion({ scope: 'credential', scope_label: 'deploy @ Web PRD' }),
    )

    expect(alcance).toBe('deploy @ Web PRD')
  })

  it('un servidor se nombra por su nombre', () => {
    const alcance = describirAlcance(concesion({ server: 's1', server_name: 'Web PRD' }))

    expect(alcance).toBe('Web PRD')
  })
})
