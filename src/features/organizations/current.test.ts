import { describe, expect, it } from 'vitest'

import { canManage, resolveOrganization } from '@/features/organizations/current'
import type { OrganizationRole, OrganizationSummary } from '@/types/api'

function organizacion(
  slug: string,
  is_personal = false,
  role: OrganizationRole = 'owner',
): OrganizationSummary {
  return {
    id: `org-${slug}`,
    name: slug,
    slug,
    color: 'teal',
    avatar_url: null,
    is_personal,
    status: 'active',
    role,
  }
}

const personal = organizacion('ana', true)
const equipo = organizacion('acme')

describe('resolveOrganization', () => {
  it('respeta la que el usuario dejo elegida', () => {
    expect(resolveOrganization([personal, equipo], 'acme')).toBe(equipo)
  })

  it('cae en la personal cuando la guardada ya no es suya', () => {
    expect(resolveOrganization([personal, equipo], 'la-que-abandono')).toBe(personal)
  })

  it('sin nada guardado abre la personal', () => {
    expect(resolveOrganization([equipo, personal], null)).toBe(personal)
  })

  it('el espacio personal de quien le invitó no pasa por el suyo', () => {
    const ajeno = organizacion('abimael', true, 'member')
    expect(resolveOrganization([ajeno, personal], null)).toBe(personal)
  })

  it('sin organizaciones no inventa ninguna', () => {
    expect(resolveOrganization([], 'acme')).toBeNull()
  })
})

describe('canManage', () => {
  it('gestiona quien es propietario o administrador', () => {
    expect(canManage(organizacion('acme', false, 'owner'))).toBe(true)
    expect(canManage(organizacion('acme', false, 'admin'))).toBe(true)
  })

  it('el miembro solo usa lo que le dan', () => {
    expect(canManage(organizacion('acme', false, 'member'))).toBe(false)
    expect(canManage(null)).toBe(false)
  })
})
