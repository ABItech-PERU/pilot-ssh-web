import { useQuery } from '@tanstack/react-query'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { Link, useNavigate, useOutletContext } from 'react-router'

import { Bloque, VacioDeBloque, VerTodo } from '@/components/bloque'
import { Button } from '@/components/ui/button'
import { puedeGestionar } from '@/features/access/levels'
import * as serversApi from '@/features/servers/api'
import { LinkChips } from '@/features/servers/LinkChips'
import { buildServerPath } from '@/features/servers/paths'
import { FilaCredencial, Origen, SesionesLista } from '@/features/servers/server-parts'
import { useCredentialActions } from '@/features/servers/use-credential-actions'
import type { Server } from '@/types/api'

const CREDENCIALES_EN_RESUMEN = 5
const SESIONES_EN_RESUMEN = 3

/** Listas largas cortadas, con enlace a su pestana. */
export function ServerSummaryTab() {
  const server = useOutletContext<Server>()
  const navegar = useNavigate()
  const { acciones, dialogos } = useCredentialActions(server)
  // Anadir y editar solo quien gestiona la maquina
  const gestiona = puedeGestionar(server)

  const historial = useQuery({
    queryKey: serversApi.clavesServidor.historial(server.id, 1, SESIONES_EN_RESUMEN),
    queryFn: () => serversApi.fetchHistory(server.id, 1, SESIONES_EN_RESUMEN),
  })

  const visibles = server.users.slice(0, CREDENCIALES_EN_RESUMEN)
  const ocultas = server.users.length - visibles.length

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <Bloque
          titulo="Credenciales"
          accion={
            gestiona && (
              <Button variant="ghost" size="sm" onClick={acciones.onAnadirCredencial}>
                <PlusIcon />
                Añadir
              </Button>
            )
          }
        >
          {server.users.length === 0 ? (
            <VacioDeBloque
              texto="Sin credencial no hay terminal."
              accion="Añadir credencial"
              onAccion={gestiona ? acciones.onAnadirCredencial : undefined}
            />
          ) : (
            <ul className="divide-y">
              {visibles.map((credencial) => (
                <FilaCredencial
                  key={credencial.id}
                  server={server}
                  credencial={credencial}
                  compacta
                  acciones={acciones}
                />
              ))}
            </ul>
          )}
          {ocultas > 0 && (
            <VerTodo to={buildServerPath(server.id, 'credentials')}>
              Ver {server.users.length} credenciales
            </VerTodo>
          )}
        </Bloque>

        <Bloque titulo="Últimas sesiones">
          <SesionesLista consulta={historial} />
          {/* Al pie, como en las credenciales: un solo acceso al historial */}
          {server.total_sessions > 0 && (
            <VerTodo to={buildServerPath(server.id, 'sessions')}>
              Ver el historial
            </VerTodo>
          )}
        </Bloque>
      </div>

      <div className="space-y-6">
        <Bloque
          titulo="Enlaces del servidor"
          accion={
            gestiona &&
            server.links.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link to={buildServerPath(server.id, 'links')}>
                  <PencilIcon />
                  Editar
                </Link>
              </Button>
            )
          }
        >
          {server.links.length === 0 ? (
            <VacioDeBloque
              texto="El panel, el monitoreo y todo lo del servidor entero."
              accion="Añadir enlace"
              onAccion={
                gestiona ? () => navegar(buildServerPath(server.id, 'links')) : undefined
              }
            />
          ) : (
            // Filas, igual que el bloque de credenciales
            <LinkChips links={server.links} presentacion="filas" />
          )}
        </Bloque>

        <Origen server={server} />
      </div>

      {dialogos}
    </div>
  )
}
