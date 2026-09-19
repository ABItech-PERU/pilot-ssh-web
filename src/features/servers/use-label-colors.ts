import { useQuery } from '@tanstack/react-query'

import { useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { buildLabelColors } from '@/features/servers/labels'

/** Misma clave de catálogo que el formulario y la pestaña Etiquetas: una
 *  sola petición. */
export function useLabelColors() {
  const { slug } = useCurrentOrganization()

  const catalogo = useQuery({
    queryKey: serversApi.clavesServidor.catalogo(slug),
    queryFn: () => serversApi.fetchLabelCatalog(slug!),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  })

  return buildLabelColors(catalogo.data ?? [])
}
