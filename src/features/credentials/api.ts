import { http } from '@/lib/http'
import type { FiltrosDeHistorial } from '@/features/servers/api'
import type { Rango } from '@/lib/periods'
import type { CredentialStats, Paginated, ServerUser, TerminalSession } from '@/types/api'

/** Lista paginada: la busqueda se resuelve en el servidor. */
export interface FiltrosCredencial {
  organization?: string
  server_id?: string
  search?: string
  auth_type?: string
  /** `clave:opcion` de la credencial; la de su servidor no cuenta. */
  label?: string
  ordering?: string
  page?: number
  page_size?: number
}

export const clavesCredencial = {
  todas: (filtros: FiltrosCredencial) => ['credentials', filtros] as const,
  detalle: (id: string) => ['credentials', 'detalle', id] as const,
  etiquetas: (organizationSlug: string | null) =>
    ['credentials', 'labels', organizationSlug] as const,
  historial: (
    id: string,
    page: number,
    pageSize: number,
    filtros: FiltrosDeHistorial = {},
  ) => ['credentials', 'detalle', id, 'history', page, pageSize, filtros] as const,
  estadisticas: (id: string, rango: Rango) =>
    ['credentials', 'detalle', id, 'stats', rango] as const,
}

export async function fetchCredentials(filtros: FiltrosCredencial) {
  const { data } = await http.get<Paginated<ServerUser>>('/server-users', {
    params: filtros,
  })
  return data
}

/** Etiquetas de credenciales por clave, para su filtro. Excluye las de
 *  servidores: no salen en su columna. */
export async function fetchLabels(organizationSlug: string) {
  const { data } = await http.get<Record<string, string[]>>('/server-users/labels', {
    params: { organization: organizationSlug },
  })
  return data
}

export async function fetchCredential(id: string) {
  const { data } = await http.get<ServerUser>(`/server-users/${id}`)
  return data
}

/** Solo sesiones de esta credencial; el del servidor mezcla todas. */
export async function fetchHistory(
  id: string,
  page: number,
  pageSize: number,
  filtros: FiltrosDeHistorial = {},
) {
  const { data } = await http.get<Paginated<TerminalSession>>(
    `/server-users/${id}/history`,
    { params: { page, page_size: pageSize, ...filtros } },
  )
  return data
}

export async function fetchStats(id: string, rango: Rango) {
  const { data } = await http.get<CredentialStats>(`/server-users/${id}/stats`, {
    params: { from: rango.from || undefined, to: rango.to || undefined },
  })
  return data
}
