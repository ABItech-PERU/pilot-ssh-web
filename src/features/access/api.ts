import type { QueryClient } from '@tanstack/react-query'

import { http } from '@/lib/http'
import type {
  AccessDiagnosis,
  AccessGrant,
  AccessGroup,
  AccessLevel,
  MemberAccess,
  Paginated,
  ServerAccess,
} from '@/types/api'

export const clavesAcceso = {
  delServidor: (id: string) => ['access', 'server', id] as const,
  grupos: (slug: string | null) => ['access-groups', slug] as const,
  dePersona: (membresia: string) => ['access', 'member', membresia] as const,
  // Bajo `access`: compartir o quitar un acceso cambia el diagnostico
  diagnostico: (servidor: string, membresia: string) =>
    ['access', 'diagnosis', servidor, membresia] as const,
  concesiones: (slug: string | null, grupo?: string) =>
    ['access-grants', slug, grupo ?? null] as const,
}

/** Punto único para invalidar tras un cambio de acceso: grupos,
 *  concesiones, acceso por persona e inventario. */
export async function invalidarAcceso(cliente: QueryClient) {
  await Promise.all([
    cliente.invalidateQueries({ queryKey: ['access-groups'] }),
    cliente.invalidateQueries({ queryKey: ['access-grants'] }),
    cliente.invalidateQueries({ queryKey: ['access'] }),
    cliente.invalidateQueries({ queryKey: ['servers'] }),
  ])
}

export async function fetchServerAccess(id: string) {
  const { data } = await http.get<ServerAccess>(`/servers/${id}/access`)
  return data
}

/** Por qué un miembro no abre terminal en este servidor. */
export async function fetchDiagnosis(servidor: string, membresia: string) {
  const { data } = await http.get<AccessDiagnosis>(`/servers/${servidor}/diagnosis`, {
    params: { membership: membresia },
  })
  return data
}

/** A que maquinas entra una persona y por que via. */
export async function fetchMemberAccess(membresia: string) {
  const { data } = await http.get<MemberAccess>(`/members/${membresia}/access`)
  return data
}

export async function fetchGroups(slug: string) {
  const { data } = await http.get<Paginated<AccessGroup>>('/access-groups', {
    params: { organization: slug, page_size: 100 },
  })
  return data.results
}

export async function fetchGrants(slug: string, group?: string) {
  const { data } = await http.get<Paginated<AccessGrant>>('/access-grants', {
    params: { organization: slug, group, page_size: 100 },
  })
  return data.results
}

/** Sin alcance, la concesion cubre la organizacion entera. */
export interface GrantInput {
  organization: string
  group?: string
  email?: string
  server?: string
  server_user?: string
  label_key?: string
  label_value?: string
  level: AccessLevel
  expires_at?: string | null
}

/** Concede, o cambia el nivel si el sujeto ya tiene ese alcance. */
export async function grant(input: GrantInput) {
  const { data } = await http.post<AccessGrant>('/access-grants', input)
  return data
}

export async function revoke(id: string) {
  await http.delete(`/access-grants/${id}`)
}

export async function createGroup(input: {
  organization: string
  name: string
  description?: string
}) {
  const { data } = await http.post<AccessGroup>('/access-groups', input)
  return data
}

export async function renameGroup(
  id: string,
  input: { name: string; description: string },
) {
  const { data } = await http.patch<AccessGroup>(`/access-groups/${id}`, input)
  return data
}

export async function deleteGroup(id: string) {
  await http.delete(`/access-groups/${id}`)
}

export async function addToGroup(id: string, membership: string) {
  const { data } = await http.post<AccessGroup>(`/access-groups/${id}/members`, {
    membership,
  })
  return data
}

/** Grupos de quien acepte la invitacion. Reemplaza la lista entera. */
export async function setInvitationGroups(invitation: string, groups: string[]) {
  await http.put(`/invitations/${invitation}/groups`, { groups })
}

export async function removeFromGroup(id: string, membership: string) {
  await http.delete(`/access-groups/${id}/members/${membership}`)
}
