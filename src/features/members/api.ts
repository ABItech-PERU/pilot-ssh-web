import { http } from '@/lib/http'
import type {
  Invitation,
  InvitationPreview,
  Membership,
  OrganizationRole,
} from '@/types/api'

export const clavesEquipo = {
  miembros: (slug: string | null, filtros: Record<string, string> = {}) =>
    ['members', slug, filtros] as const,
  invitaciones: (slug: string | null) => ['invitations', slug] as const,
  invitacion: (token: string) => ['invitation', token] as const,
}

export async function fetchMembers(slug: string, filtros?: Record<string, string>) {
  const { data } = await http.get<Membership[]>(`/organizations/${slug}/members`, {
    params: filtros,
  })
  return data
}

export async function fetchInvitations(slug: string) {
  const { data } = await http.get<Invitation[]>(`/organizations/${slug}/invitations`)
  return data
}

export async function invite(
  slug: string,
  input: { email: string; role: OrganizationRole },
) {
  const { data } = await http.post<Invitation>(
    `/organizations/${slug}/invitations`,
    input,
  )
  return data
}

/** Renueva el plazo y reenvía; el enlace anterior deja de valer. */
export async function resendInvitation(slug: string, id: string) {
  const { data } = await http.post<Invitation>(`/organizations/${slug}/invitations/${id}`)
  return data
}

export async function revokeInvitation(slug: string, id: string) {
  await http.delete(`/organizations/${slug}/invitations/${id}`)
}

export async function changeRole(slug: string, id: string, role: OrganizationRole) {
  const { data } = await http.patch<Membership>(`/organizations/${slug}/members/${id}`, {
    role,
  })
  return data
}

export async function removeMember(slug: string, id: string) {
  await http.delete(`/organizations/${slug}/members/${id}`)
}

/** Pública: quien la recibe puede no tener cuenta. */
export async function fetchInvitation(token: string) {
  const { data } = await http.get<InvitationPreview>(`/invitations/${token}`)
  return data
}

export async function acceptInvitation(token: string) {
  const { data } = await http.post<Membership>(`/invitations/${token}/accept`)
  return data
}
