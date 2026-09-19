import { useOutletContext } from 'react-router'

import * as credentialsApi from '@/features/credentials/api'
import { SessionsHistory } from '@/features/servers/SessionsHistory'
import type { ServerUser } from '@/types/api'

/** Sin columna ni filtro de credencial: todas las filas son esta. */
export function CredentialSessionsTab() {
  const credencial = useOutletContext<ServerUser>()

  return (
    <SessionsHistory
      clave={(pagina, porPagina, filtros) =>
        credentialsApi.clavesCredencial.historial(
          credencial.id,
          pagina,
          porPagina,
          filtros,
        )
      }
      pedir={(pagina, porPagina, filtros) =>
        credentialsApi.fetchHistory(credencial.id, pagina, porPagina, filtros)
      }
      total={credencial.total_sessions}
    />
  )
}
