import { useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router'

import { puedeGestionar } from '@/features/access/levels'
import * as serversApi from '@/features/servers/api'
import { LinksEditor } from '@/features/servers/LinksEditor'
import type { Server } from '@/types/api'

export function ServerLinksTab() {
  const server = useOutletContext<Server>()
  const cliente = useQueryClient()

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted-foreground text-sm">
        El panel, el monitoreo y todo lo del servidor entero. Lo de cada usuario va en su
        credencial.
      </p>
      <LinksEditor
        key={server.id}
        links={server.links}
        primerTipo="panel"
        vacio="Todavía no hay enlaces."
        soloLectura={!puedeGestionar(server)}
        onGuardar={async (links) => {
          const actualizado = await serversApi.updateServer(server.id, { links })
          await cliente.invalidateQueries({ queryKey: ['servers'] })
          return actualizado.links
        }}
      />
    </div>
  )
}
