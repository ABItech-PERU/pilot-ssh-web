import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, PencilIcon, PlusIcon, ServerIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Bloque, VacioDeBloque, VerTodo } from '@/components/bloque'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetFooter, SheetTitle } from '@/components/ui/sheet'
import { puedeGestionar } from '@/features/access/levels'
import * as serversApi from '@/features/servers/api'
import { LinkChips } from '@/features/servers/LinkChips'
import { buildServerPath } from '@/features/servers/paths'
import {
  AbrirTerminal,
  CopiarDireccion,
  FilaCredencial,
  Metricas,
  Origen,
  SesionesLista,
  VerificadoBadge,
  type AccionesDeCredencial,
} from '@/features/servers/server-parts'
import { useCredentialActions } from '@/features/servers/use-credential-actions'
import type { Server } from '@/types/api'

/** Vistazo desde la lista; lo largo vive en la pagina del servidor. */
export type VistaFicha = 'resumen' | 'credenciales'

const CREDENCIALES_EN_RESUMEN = 5
const SESIONES_EN_RESUMEN = 3

interface Props {
  /** Fila de la lista: pinta la ficha mientras llega el detalle. */
  server: Server | null
  /** El icono de terminal abre directo en credenciales. */
  vista?: VistaFicha
  onOpenChange: (open: boolean) => void
}

export function ServerDetailSheet({ server, vista = 'resumen', onOpenChange }: Props) {
  const abierta = Boolean(server)

  const detalle = useQuery({
    queryKey: serversApi.clavesServidor.detalle(server?.id ?? ''),
    queryFn: () => serversApi.fetchServer(server!.id),
    enabled: abierta,
    placeholderData: server ?? undefined,
  })

  const ficha = detalle.data ?? server

  return (
    <Sheet open={abierta} onOpenChange={onOpenChange}>
      <SidePanelContent>
        {ficha && (
          // La clave remonta al cambiar de servidor o vista: estado limpio
          // sin efecto que lo vigile
          <Contenido key={`${ficha.id}-${vista}`} server={ficha} vistaInicial={vista} />
        )}
      </SidePanelContent>
    </Sheet>
  )
}

function Contenido({
  server,
  vistaInicial,
}: {
  server: Server
  vistaInicial: VistaFicha
}) {
  const [vista, setVista] = useState<VistaFicha>(vistaInicial)
  const { acciones, dialogos } = useCredentialActions(server)
  // Abierto en credenciales: sin resumen al que volver, la X cierra
  const vinoDelResumen = vistaInicial === 'resumen'

  return (
    <>
      {vista === 'credenciales' ? (
        <VistaCredenciales
          server={server}
          acciones={acciones}
          onVolver={vinoDelResumen ? () => setVista('resumen') : undefined}
        />
      ) : (
        <VistaResumen
          server={server}
          acciones={acciones}
          onVerCredenciales={() => setVista('credenciales')}
        />
      )}
      {dialogos}
    </>
  )
}

interface ResumenProps {
  server: Server
  acciones: AccionesDeCredencial
  onVerCredenciales: () => void
}

function VistaResumen({ server, acciones, onVerCredenciales }: ResumenProps) {
  const navegar = useNavigate()
  // Anadir y editar solo quien gestiona la maquina
  const gestiona = puedeGestionar(server)

  const historial = useQuery({
    queryKey: serversApi.clavesServidor.historial(server.id, 1, SESIONES_EN_RESUMEN),
    queryFn: () => serversApi.fetchHistory(server.id, 1, SESIONES_EN_RESUMEN),
  })

  const visibles = server.users.slice(0, CREDENCIALES_EN_RESUMEN)
  const ocultas = server.users.length - visibles.length

  return (
    <>
      <SidePanelHeader>
        <SheetTitle className="text-lg break-words">
          {server.name}
          <VerificadoBadge server={server} />
        </SheetTitle>
        <SheetDescription asChild>
          <CopiarDireccion valor={`${server.ip}:${server.port}`} />
        </SheetDescription>
      </SidePanelHeader>

      <SidePanelBody className="space-y-6 p-5">
        <Metricas server={server} />

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
            <VerTodo onClick={onVerCredenciales}>
              Ver {server.users.length} credenciales
            </VerTodo>
          )}
        </Bloque>

        <Bloque titulo="Últimas sesiones">
          <SesionesLista consulta={historial} />
          {server.total_sessions > 0 && (
            <VerTodo to={buildServerPath(server.id, 'sessions')}>
              Ver el historial
            </VerTodo>
          )}
        </Bloque>

        <Origen server={server} />
      </SidePanelBody>

      <SheetFooter className="flex-row border-t p-5">
        <Button asChild variant="outline" className="flex-1">
          <Link to={buildServerPath(server.id)}>
            <ServerIcon />
            Ver detalle
          </Link>
        </Button>
        <AbrirTerminal server={server} className="flex-1" />
      </SheetFooter>
    </>
  )
}

interface CredencialesProps {
  server: Server
  acciones: AccionesDeCredencial
  onVolver?: () => void
}

/** Cada credencial con su terminal a la vista. */
function VistaCredenciales({ server, acciones, onVolver }: CredencialesProps) {
  return (
    <>
      <SidePanelHeader>
        <div className="flex items-center gap-1">
          {onVolver && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-2"
              aria-label="Volver al resumen"
              onClick={onVolver}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
          )}
          <SheetTitle className="text-lg">Credenciales</SheetTitle>
        </div>
        <SheetDescription>
          {server.name} ·{' '}
          <span className="font-machine">
            {server.ip}:{server.port}
          </span>
        </SheetDescription>
      </SidePanelHeader>

      {/* Sin marco propio: una caja dentro del panel duplica los bordes */}
      <SidePanelBody>
        {server.users.length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">
            Sin credencial no hay terminal.
          </p>
        ) : (
          <ul className="divide-y">
            {server.users.map((credencial) => (
              <FilaCredencial
                key={credencial.id}
                server={server}
                credencial={credencial}
                acciones={acciones}
              />
            ))}
          </ul>
        )}
      </SidePanelBody>

      <SidePanelFooter>
        {puedeGestionar(server) && (
          <Button className="flex-1" onClick={acciones.onAnadirCredencial}>
            <PlusIcon />
            Añadir credencial
          </Button>
        )}
      </SidePanelFooter>
    </>
  )
}
