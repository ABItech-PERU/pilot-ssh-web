import { useQueryClient } from '@tanstack/react-query'

import { SidePanelContent, SidePanelHeader } from '@/components/side-panel'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { puedeGestionar } from '@/features/access/levels'
import * as serversApi from '@/features/servers/api'
import { LinksEditor } from '@/features/servers/LinksEditor'
import type { Server, ServerUser } from '@/types/api'

interface Props {
  credential: ServerUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Mismo armazon que la ficha del servidor. Alta y edicion, solo para quien
 *  gestiona. */
export function CredentialLinksSheet({ credential, open, onOpenChange }: Props) {
  const cliente = useQueryClient()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">
            {credential ? `Enlaces de ${credential.username}` : 'Enlaces'}
          </SheetTitle>
          <SheetDescription className="font-machine">
            {credential ? `${credential.server_name} · ${credential.server_ip}` : ''}
          </SheetDescription>
        </SidePanelHeader>

        {credential && (
          <LinksEditor
            key={credential.id}
            links={credential.links}
            primerTipo="web"
            alPie
            soloLectura={!puedeGestionar(credential)}
            vacio={
              puedeGestionar(credential)
                ? 'Su web, su base de datos, su repositorio.'
                : 'Todavía no hay enlaces.'
            }
            onGuardar={async (links) => {
              const actualizada = await serversApi.updateCredential(credential.id, {
                links,
              })
              await cliente.invalidateQueries({ queryKey: ['servers'] })
              await cliente.invalidateQueries({ queryKey: ['credentials'] })
              return actualizada.links
            }}
          />
        )}
      </SidePanelContent>
    </Sheet>
  )
}

interface ServerProps {
  server: Server | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Enlaces de la maquina entera, en panel lateral para no salir de la
 *  lista. Sin gestionar: misma fila, sin alta ni edicion. */
export function ServerLinksSheet({ server, open, onOpenChange }: ServerProps) {
  const cliente = useQueryClient()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">
            {server ? `Enlaces de ${server.name}` : 'Enlaces'}
          </SheetTitle>
          <SheetDescription className="font-machine">
            {server ? `${server.ip}:${server.port}` : ''}
          </SheetDescription>
        </SidePanelHeader>

        {server && (
          <LinksEditor
            key={server.id}
            links={server.links}
            primerTipo="panel"
            alPie
            soloLectura={!puedeGestionar(server)}
            vacio={
              puedeGestionar(server)
                ? 'El panel, el monitoreo y todo lo del servidor entero.'
                : 'Todavía no hay enlaces.'
            }
            onGuardar={async (links) => {
              const actualizado = await serversApi.updateServer(server.id, { links })
              await cliente.invalidateQueries({ queryKey: ['servers'] })
              return actualizado.links
            }}
          />
        )}
      </SidePanelContent>
    </Sheet>
  )
}
