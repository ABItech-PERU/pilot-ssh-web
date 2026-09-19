import { http } from '@/lib/http'
import type { AuditLogList } from '@/types/api'

/** Filtros del registro; los aplica el servidor, que pagina. */
export interface FiltrosDeAuditoria {
  search?: string
  category?: string
  actor?: string
  /** `AAAA-MM-DD`; cuenta el día entero. */
  from?: string
  to?: string
}

export const clavesAuditoria = {
  registro: (
    slug: string,
    pagina: number,
    porPagina: number,
    filtros: FiltrosDeAuditoria,
  ) => ['audit', slug, pagina, porPagina, filtros] as const,
}

export async function fetchAuditLog(
  slug: string,
  pagina: number,
  porPagina: number,
  filtros: FiltrosDeAuditoria,
) {
  const { data } = await http.get<AuditLogList>('/audit', {
    params: {
      organization: slug,
      page: pagina,
      page_size: porPagina,
      ...filtros,
    },
  })
  return data
}

/** El registro filtrado, en Excel con formato. */
export async function exportAuditLog(slug: string, filtros: FiltrosDeAuditoria) {
  const { data } = await http.get<Blob>('/audit/export', {
    params: { organization: slug, ...filtros },
    responseType: 'blob',
  })
  return data
}
