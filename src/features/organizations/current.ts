import { useSyncExternalStore } from 'react'

import { useSession } from '@/features/auth/session'
import type { OrganizationSummary } from '@/types/api'

/** Organización actual: filtra toda consulta de dominio (créditos,
 *  auditoría, servidores). */

const CLAVE = 'pilotssh.organization'

let cached: string | null | undefined
const listeners = new Set<() => void>()

function readStored(): string | null {
  if (cached === undefined) {
    try {
      cached = window.localStorage.getItem(CLAVE)
    } catch {
      cached = null
    }
  }
  return cached
}

export function setCurrentOrganizationSlug(slug: string) {
  cached = slug
  try {
    window.localStorage.setItem(CLAVE, slug)
  } catch {
    // Sin almacenamiento, la elección dura lo que la pestaña
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Espacio personal propio: el de quien le invitó también es personal. */
export function isOwnSpace(
  organization: Pick<OrganizationSummary, 'is_personal' | 'role'>,
) {
  return organization.is_personal && organization.role === 'owner'
}

/** Propietario o administrador; el miembro solo usa sus accesos. */
export function canManage(
  organization: Pick<OrganizationSummary, 'role'> | null | undefined,
) {
  return organization?.role === 'owner' || organization?.role === 'admin'
}

/** La guardada si sigue en la lista; si no, la personal o la primera.
 *  Un slug abandonado daría 404 en todas las consultas. */
export function resolveOrganization(
  organizations: readonly OrganizationSummary[],
  guardado: string | null,
): OrganizationSummary | null {
  const elegida = organizations.find((una) => una.slug === guardado)
  const personal = organizations.find(isOwnSpace)

  return elegida ?? personal ?? organizations[0] ?? null
}

export function useCurrentOrganization() {
  const { user } = useSession()
  const guardado = useSyncExternalStore(subscribe, readStored)

  const organizations = user?.organizations ?? []
  const organization = resolveOrganization(organizations, guardado)

  return {
    organization,
    organizations,
    slug: organization?.slug ?? null,
    setOrganization: setCurrentOrganizationSlug,
  }
}
