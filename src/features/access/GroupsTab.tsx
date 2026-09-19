import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import * as accessApi from '@/features/access/api'
import { GroupAccessDialog } from '@/features/access/GroupAccessDialog'
import { GroupNameDialog } from '@/features/access/GroupNameDialog'
import { GroupRow } from '@/features/access/GroupRow'
import type { ContextoDelEquipo } from '@/features/members/TeamPage'
import { toApiError } from '@/lib/api-error'
import type { AccessGroup } from '@/types/api'

/** Miembros: se despliegan en la fila. Alcance: se edita en su diálogo. */
export function GroupsTab() {
  const { slug, administra } = useOutletContext<ContextoDelEquipo>()
  const cliente = useQueryClient()
  const [creando, setCreando] = useState(false)
  const [renombrando, setRenombrando] = useState<AccessGroup | null>(null)
  const [conAccesos, setConAccesos] = useState<AccessGroup | null>(null)
  const [eliminando, setEliminando] = useState<AccessGroup | null>(null)

  const grupos = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(slug),
    queryFn: () => accessApi.fetchGroups(slug!),
    enabled: Boolean(slug),
  })

  const concesiones = useQuery({
    queryKey: accessApi.clavesAcceso.concesiones(slug),
    queryFn: () => accessApi.fetchGrants(slug!),
    enabled: Boolean(slug),
  })

  const eliminar = useMutation({
    mutationFn: () => accessApi.deleteGroup(eliminando!.id),
    onSuccess: async () => {
      await accessApi.invalidarAcceso(cliente)
      setEliminando(null)
      toast.success('Grupo eliminado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const lista = grupos.data ?? []
  const porGrupo = (grupo: AccessGroup) =>
    (concesiones.data ?? []).filter((concesion) => concesion.group === grupo.id)

  if (grupos.isPending) return <Skeleton className="h-40 rounded-lg" />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          El acceso se concede al grupo. Lo tiene quien esté dentro.
        </p>
        {administra && (
          <Button variant="outline" size="sm" onClick={() => setCreando(true)}>
            <PlusIcon />
            Nuevo grupo
          </Button>
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Todavía no hay grupos"
          description="Sirven para dar el mismo acceso a varias personas de una vez."
          action={
            administra && (
              <Button onClick={() => setCreando(true)}>
                <PlusIcon />
                Crear el primero
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {lista.map((grupo) => (
            <GroupRow
              key={grupo.id}
              slug={slug!}
              grupo={grupo}
              concesiones={porGrupo(grupo)}
              administra={administra}
              onAccesos={() => setConAccesos(grupo)}
              onRenombrar={() => setRenombrando(grupo)}
              onEliminar={() => setEliminando(grupo)}
            />
          ))}
        </ul>
      )}

      {slug && (
        <>
          <GroupNameDialog
            slug={slug}
            grupo={renombrando}
            open={creando || renombrando !== null}
            onOpenChange={(abierto) => {
              if (abierto) return
              setCreando(false)
              setRenombrando(null)
            }}
          />

          <GroupAccessDialog
            slug={slug}
            grupo={conAccesos}
            concesiones={conAccesos ? porGrupo(conAccesos) : []}
            onOpenChange={(abierto) => !abierto && setConAccesos(null)}
          />
        </>
      )}

      <ConfirmDialog
        open={eliminando !== null}
        onOpenChange={(abierto) => !abierto && setEliminando(null)}
        titulo={`¿Eliminar ${eliminando?.name ?? ''}?`}
        descripcion="El grupo desaparece con lo que alcanzaba."
        detalles={[
          'Quien entraba solo por este grupo deja de entrar',
          'Las personas siguen en la organización',
          'Se puede volver a crear, pero habrá que darle acceso de nuevo',
        ]}
        accion="Eliminar grupo"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => eliminar.mutate()}
      />
    </div>
  )
}
