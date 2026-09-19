import { describe, expect, it } from 'vitest'

import { conInvitacion } from '@/features/members/use-invitacion'

describe('conInvitacion', () => {
  it('lleva la invitación en la dirección para no perderla por el camino', () => {
    expect(conInvitacion('/register', 'abc-123')).toBe('/register?invitacion=abc-123')
  })

  it('sin invitación deja el enlace como estaba', () => {
    expect(conInvitacion('/login', null)).toBe('/login')
  })
})
