import { http } from '@/lib/http'
import type { Rango } from '@/lib/periods'
import type {
  LabelDefinition,
  PaletteColor,
  ResourceLink,
  AuthType,
  Paginated,
  Server,
  ServerStats,
  ServerUser,
  TerminalSession,
} from '@/types/api'

/** Filtros del backend: la lista viene paginada. */
export interface FiltrosServidor {
  organization?: string
  search?: string
  /** `with` o `without`: sin credencial no se abre terminal. */
  credentials?: string
  ordering?: string
  /** `clave:valor`. */
  label?: string
  page?: number
  /** Maximo 100. */
  page_size?: number
}

export const clavesServidor = {
  todos: (filtros: FiltrosServidor) => ['servers', filtros] as const,
  detalle: (id: string) => ['servers', 'detalle', id] as const,
  estadisticas: (id: string, rango: Rango) =>
    ['servers', 'detalle', id, 'stats', rango] as const,
  historial: (
    id: string,
    page: number,
    pageSize: number,
    filtros: FiltrosDeHistorial = {},
  ) => ['servers', 'detalle', id, 'history', page, pageSize, filtros] as const,
  etiquetas: (organizationSlug: string | null) =>
    ['servers', 'labels', organizationSlug] as const,
  catalogo: (organizationSlug: string | null) =>
    ['label-definitions', organizationSlug] as const,
}

export interface ServerInput {
  name: string
  ip: string
  port: number
  /** De la maquina entera: panel, monitoreo. */
  links?: ResourceLink[]
  /** `clave: valor`. Se reemplaza entero al guardar. */
  labels?: Record<string, string>
  organization?: string
}

export interface CredentialInput {
  server: string
  username: string
  auth_type: AuthType
  password?: string
  private_key?: string
  working_directory?: string
  links?: ResourceLink[]
  /** `clave: valor`. */
  labels?: Record<string, string>
  notes?: string
}

export async function fetchServers(filtros: FiltrosServidor) {
  const { data } = await http.get<Paginated<Server>>('/servers', { params: filtros })
  return data
}

export async function fetchServer(id: string) {
  const { data } = await http.get<Server>(`/servers/${id}`)
  return data
}

export async function createServer(input: ServerInput) {
  const { data } = await http.post<Server>('/servers', input)
  return data
}

export async function updateServer(id: string, input: Partial<ServerInput>) {
  const { data } = await http.patch<Server>(`/servers/${id}`, input)
  return data
}

export async function deleteServer(id: string) {
  await http.delete(`/servers/${id}`)
}

/** Catalogo: etiquetas que admite la organizacion. */
export async function fetchLabelCatalog(organizationSlug: string) {
  const { data } = await http.get<Paginated<LabelDefinition>>('/label-definitions', {
    params: { organization: organizationSlug, page_size: 100 },
  })
  return data.results
}

export async function defineLabel(input: {
  organization: string
  key: string
  values: string[]
  /** `opcion: color`. Lo que falte sale de la paleta. */
  colors?: Record<string, PaletteColor>
}) {
  const { data } = await http.post<LabelDefinition>('/label-definitions', input)
  return data
}

export async function renameLabel(id: string, key: string) {
  const { data } = await http.patch<LabelDefinition>(`/label-definitions/${id}`, {
    key,
  })
  return data
}

/** Opciones de una en una: renombrar una la actualiza donde esté puesta. */
export async function addLabelValue(id: string, value: string, color?: PaletteColor) {
  const { data } = await http.post<LabelDefinition>(`/label-definitions/${id}/values`, {
    value,
    color,
  })
  return data
}

/** Nombre y color de la opcion en una sola peticion. */
export async function updateLabelValue(
  id: string,
  value: string,
  cambio: { nuevo?: string; color?: PaletteColor },
) {
  const { data } = await http.patch<LabelDefinition>(`/label-definitions/${id}/values`, {
    value,
    new_value: cambio.nuevo,
    color: cambio.color,
  })
  return data
}

export async function removeLabelValue(id: string, value: string) {
  const { data } = await http.delete<LabelDefinition>(`/label-definitions/${id}/values`, {
    data: { value },
  })
  return data
}

export async function deleteLabel(id: string) {
  await http.delete(`/label-definitions/${id}`)
}

/** Etiquetas puestas en las maquinas visibles, por clave. */
export async function fetchLabels(organizationSlug: string) {
  const { data } = await http.get<Record<string, string[]>>('/servers/labels', {
    params: { organization: organizationSlug },
  })
  return data
}

/** Quien entra, que falla y que llaves no se usan. */
export async function fetchServerStats(id: string, rango: Rango) {
  const { data } = await http.get<ServerStats>(`/servers/${id}/stats`, {
    params: { from: rango.from || undefined, to: rango.to || undefined },
  })
  return data
}

/** Filtros del backend: el historial viene paginado. */
export interface FiltrosDeHistorial {
  /** El backend ignora un estado desconocido: la lista no se vacia. */
  status?: string
  credential?: string
  search?: string
  /** `AAAA-MM-DD`, dia completo (00:00 a 23:59). */
  from?: string
  to?: string
}

export async function fetchHistory(
  id: string,
  page: number,
  pageSize: number,
  filtros: FiltrosDeHistorial = {},
) {
  const { data } = await http.get<Paginated<TerminalSession>>(`/servers/${id}/history`, {
    params: {
      page,
      page_size: pageSize,
      status: filtros.status || undefined,
      credential: filtros.credential || undefined,
      search: filtros.search || undefined,
      from: filtros.from || undefined,
      to: filtros.to || undefined,
    },
  })
  return data
}

/** Credencial SSH del servidor, no una persona de la plataforma. */
export async function createCredential(input: CredentialInput) {
  const { data } = await http.post<ServerUser>('/server-users', input)
  return data
}

/** Sin `password` ni `private_key` se conserva el secreto actual. */
export async function updateCredential(id: string, input: Partial<CredentialInput>) {
  const { data } = await http.patch<ServerUser>(`/server-users/${id}`, input)
  return data
}

export async function deleteCredential(id: string) {
  await http.delete(`/server-users/${id}`)
}
