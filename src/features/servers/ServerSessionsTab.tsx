import { useOutletContext } from 'react-router'

import * as serversApi from '@/features/servers/api'
import { SessionsHistory } from '@/features/servers/SessionsHistory'
import type { Server } from '@/types/api'

/** Con filtro de credencial: aquí varía de una fila a otra. */
export function ServerSessionsTab() {
  const server = useOutletContext<Server>()

  return (
    <SessionsHistory
      clave={(pagina, porPagina, filtros) =>
        serversApi.clavesServidor.historial(server.id, pagina, porPagina, filtros)
      }
      pedir={(pagina, porPagina, filtros) =>
        serversApi.fetchHistory(server.id, pagina, porPagina, filtros)
      }
      credenciales={server.users}
      total={server.total_sessions}
    />
  )
}
