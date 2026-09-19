import { useQuery } from '@tanstack/react-query'

import { useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'

/** Hasta 100, el tope de la API; con mas, la busqueda por nombre cubre el
 *  resto. */
export function useServerOptions(activa = true) {
  const { slug } = useCurrentOrganization()

  const consulta = useQuery({
    queryKey: serversApi.clavesServidor.todos({
      organization: slug ?? '',
      page_size: 100,
    }),
    queryFn: () =>
      serversApi.fetchServers({ organization: slug ?? undefined, page_size: 100 }),
    enabled: activa && Boolean(slug),
    staleTime: 5 * 60_000,
  })

  return { servidores: consulta.data?.results ?? [], resuelta: consulta.isSuccess }
}
