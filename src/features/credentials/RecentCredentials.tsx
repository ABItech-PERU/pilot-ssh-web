import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'

import * as credentialsApi from '@/features/credentials/api'
import { buildCredentialPath } from '@/features/credentials/paths'
import { useCurrentOrganization } from '@/features/organizations/current'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'

const CUANTAS = 10

/** Accesos recientes en la barra lateral. Diez caben en un portátil; si
 *  no, la lista desplaza y el resto de la barra queda fijo. */
export function RecentCredentials() {
  const { slug } = useCurrentOrganization()

  const filtros: credentialsApi.FiltrosCredencial = {
    organization: slug ?? undefined,
    ordering: '-last_session_at',
    page_size: CUANTAS,
  }

  const consulta = useQuery({
    queryKey: credentialsApi.clavesCredencial.todas({
      ...filtros,
      organization: slug ?? '',
    }),
    queryFn: () => credentialsApi.fetchCredentials(filtros),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })

  // Solo credenciales con algún uso
  const usadas = (consulta.data?.results ?? []).filter(
    (credencial) => credencial.last_used_at,
  )

  if (usadas.length === 0) return null

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col">
      <p className="text-muted-foreground px-2.5 pb-1 text-xs font-medium">
        Usadas hace poco
      </p>

      {/* min-h-16: con la ventana muy baja asoma al menos una fila */}
      <ul className="scroll-sin-barra min-h-16 flex-1 overflow-y-auto">
        {usadas.map((credencial) => {
          const { icono: Icono, etiqueta } = FORMAS_DE_ENTRAR[credencial.auth_type]

          return (
            <li key={credencial.id}>
              <NavLink
                to={buildCredentialPath(credencial.id)}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  ].join(' ')
                }
              >
                <Icono className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="font-machine texto-desvanecido block text-sm">
                    {credencial.username}
                    <span className="sr-only"> · {etiqueta}</span>
                  </span>
                  <span className="texto-desvanecido block text-xs opacity-70">
                    {credencial.server_name}
                  </span>
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
