import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'

import { VacioDeBloque } from '@/components/bloque'
import { SearchInput } from '@/components/filter-bar'
import { Button } from '@/components/ui/button'
import { puedeGestionar } from '@/features/access/levels'
import { FilaCredencial } from '@/features/servers/server-parts'
import { useCredentialActions } from '@/features/servers/use-credential-actions'
import type { Server } from '@/types/api'

const BUSCADOR_DESDE = 6

/** El detalle trae todas sin paginar: se filtra en el cliente. */
export function ServerCredentialsTab() {
  const server = useOutletContext<Server>()
  const { acciones, dialogos } = useCredentialActions(server)
  const gestiona = puedeGestionar(server)
  const [busqueda, setBusqueda] = useState('')

  const texto = busqueda.trim().toLowerCase()
  const filtradas = server.users.filter((credencial) =>
    credencial.username.toLowerCase().includes(texto),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {server.users.length >= BUSCADOR_DESDE ? (
          <SearchInput
            etiqueta="Buscar credenciales"
            placeholder="Usuario"
            valor={busqueda}
            onChange={setBusqueda}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Con qué usuario se entra a este servidor.
          </p>
        )}
        {gestiona && (
          <Button onClick={acciones.onAnadirCredencial}>
            <PlusIcon />
            Añadir credencial
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        {server.users.length === 0 ? (
          <VacioDeBloque
            texto="Sin credencial no hay terminal."
            accion="Añadir credencial"
            onAccion={gestiona ? acciones.onAnadirCredencial : undefined}
          />
        ) : filtradas.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">Ninguna coincide.</p>
        ) : (
          <ul className="divide-y">
            {filtradas.map((credencial) => (
              <FilaCredencial
                key={credencial.id}
                server={server}
                credencial={credencial}
                acciones={acciones}
              />
            ))}
          </ul>
        )}
      </div>

      {dialogos}
    </div>
  )
}
