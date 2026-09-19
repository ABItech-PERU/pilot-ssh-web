import { http } from '@/lib/http'
import type { Membership, Organization, Paginated } from '@/types/api'

export const clavesOrganizacion = {
  todas: ['organizations'] as const,
  detalle: (slug: string) => ['organizations', slug] as const,
  miembros: (slug: string) => ['organizations', slug, 'members'] as const,
}

export async function fetchOrganizations() {
  const { data } = await http.get<Paginated<Organization>>('/organizations')
  return data
}

export async function fetchOrganization(slug: string) {
  const { data } = await http.get<Organization>(`/organizations/${slug}`)
  return data
}

export async function fetchMembers(slug: string) {
  const { data } = await http.get<Paginated<Membership>>(`/organizations/${slug}/members`)
  return data
}

export async function createOrganization(input: { name: string; slug?: string }) {
  const { data } = await http.post<Organization>('/organizations', input)
  return data
}

export async function updateOrganization(
  slug: string,
  input: { name?: string; slug?: string },
) {
  const { data } = await http.patch<Organization>(`/organizations/${slug}`, input)
  return data
}

export async function deleteOrganization(slug: string) {
  await http.delete(`/organizations/${slug}`)
}

export async function uploadAvatar(slug: string, imagen: Blob) {
  const cuerpo = new FormData()
  cuerpo.append('avatar', imagen, 'avatar.webp')
  // Content-Type sin fijar: el cliente pone JSON por defecto y el servidor
  // rechazaría el formato
  const { data } = await http.post<Organization>(
    `/organizations/${slug}/avatar`,
    cuerpo,
    { headers: { 'Content-Type': undefined } },
  )
  return data
}

export async function deleteAvatar(slug: string) {
  const { data } = await http.delete<Organization>(`/organizations/${slug}/avatar`)
  return data
}

/** `suggestions` solo si está ocupada: tres libres a partir de la pedida. */
export interface SlugAvailability {
  slug: string
  available: boolean
  reason: string
  suggestions?: string[]
}

export async function checkSlugAvailability(slug: string) {
  const { data } = await http.get<SlugAvailability>('/organizations/slug-disponible', {
    params: { slug },
  })
  return data
}
