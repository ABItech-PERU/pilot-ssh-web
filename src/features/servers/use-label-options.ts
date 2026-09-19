import { useQuery } from '@tanstack/react-query'

import { useCurrentOrganization } from '@/features/organizations/current'
import { buildLabelOptions } from '@/features/servers/labels'

/** Opciones de filtro a partir de las etiquetas puestas. Cada lista pide
 *  solo las que muestra su columna. `cargando`: hueco reservado. */
export function useLabelOptions(
  clave: (organizationSlug: string | null) => readonly unknown[],
  pedir: (organizationSlug: string) => Promise<Record<string, string[]>>,
) {
  const { slug } = useCurrentOrganization()

  const etiquetas = useQuery({
    queryKey: clave(slug),
    queryFn: () => pedir(slug!),
    enabled: Boolean(slug),
  })

  return {
    opciones: buildLabelOptions(etiquetas.data ?? {}),
    cargando: etiquetas.isPending,
  }
}
