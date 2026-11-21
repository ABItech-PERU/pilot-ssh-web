import { useQuery } from '@tanstack/react-query'
import { PlusIcon, TagIcon } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'

import { EmptyState, ListaEsqueleto } from '@/components/states'
import { Button } from '@/components/ui/button'
import { LabelNameDialog } from '@/features/servers/LabelNameDialog'
import { LabelRow } from '@/features/servers/LabelRow'
import * as serversApi from '@/features/servers/api'
import type { ContextoDelEquipo } from '@/features/members/TeamPage'
import type { LabelDefinition } from '@/types/api'

/** Catálogo: se define una vez y se elige, sin erratas. Vive junto al
 *  equipo porque las etiquetas conceden acceso. */
export function LabelsTab() {
  const { slug, administra } = useOutletContext<ContextoDelEquipo>()
  const [renombrando, setRenombrando] = useState<LabelDefinition | null>(null)
  const [creando, setCreando] = useState(false)

  const catalogo = useQuery({
    queryKey: serversApi.clavesServidor.catalogo(slug),
    queryFn: () => serversApi.fetchLabelCatalog(slug!),
    enabled: Boolean(slug),
  })

  const etiquetas = catalogo.data ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Agrupan servidores y credenciales para dar acceso a todos de una vez.
        </p>
        {administra && (
          <Button variant="outline" size="sm" onClick={() => setCreando(true)}>
            <PlusIcon />
            Nueva etiqueta
          </Button>
        )}
      </div>

      {catalogo.isPending ? (
        <ListaEsqueleto filas={2} />
      ) : etiquetas.length === 0 ? (
        <EmptyState
          enmarcado
          icon={TagIcon}
          title="Todavía no hay etiquetas"
          description="Con «Entorno» se concede acceso a toda la producción de una vez."
          action={
            administra && (
              <Button onClick={() => setCreando(true)}>
                <PlusIcon />
                Crear la primera
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {etiquetas.map((etiqueta) => (
            <LabelRow
              key={etiqueta.id}
              etiqueta={etiqueta}
              administra={administra}
              onRenombrar={() => setRenombrando(etiqueta)}
            />
          ))}
        </ul>
      )}

      {slug && (
        <LabelNameDialog
          slug={slug}
          etiqueta={renombrando}
          open={creando || renombrando !== null}
          onOpenChange={(abierto) => {
            if (abierto) return
            setCreando(false)
            setRenombrando(null)
          }}
        />
      )}
    </div>
  )
}
