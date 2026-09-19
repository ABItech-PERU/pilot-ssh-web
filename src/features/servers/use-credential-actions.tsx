import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { CredentialAccessSheet } from '@/features/access/CredentialAccessSheet'
import { useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { CredentialFormDialog } from '@/features/servers/CredentialFormDialog'
import { CredentialLabelsDialog } from '@/features/servers/CredentialLabelsDialog'
import { describeCredentialLoss } from '@/features/servers/deletion'
import { CredentialLinksSheet } from '@/features/servers/LinksSheet'
import type { AccionesDeCredencial } from '@/features/servers/server-parts'
import { toApiError } from '@/lib/api-error'
import type { Server, ServerUser } from '@/types/api'

/** Acciones sobre las credenciales de un servidor, compartidas por ficha y
 *  pagina. `dialogos` se pinta donde vivan las filas. */
export function useCredentialActions(server: Server): {
  acciones: AccionesDeCredencial
  dialogos: React.ReactNode
} {
  const cliente = useQueryClient()
  const { organization } = useCurrentOrganization()
  const [altaAbierta, setAltaAbierta] = useState(false)
  const [compartiendo, setCompartiendo] = useState<ServerUser | null>(null)
  const [enEdicion, setEnEdicion] = useState<ServerUser | null>(null)
  const [aBorrar, setABorrar] = useState<ServerUser | null>(null)
  const [enlacesDe, setEnlacesDe] = useState<ServerUser | null>(null)
  const [etiquetasDe, setEtiquetasDe] = useState<ServerUser | null>(null)

  const eliminar = useMutation({
    mutationFn: serversApi.deleteCredential,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      toast.success('Credencial eliminada.')
      setABorrar(null)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cerrarFormulario = (abierto: boolean) => {
    if (abierto) return
    setAltaAbierta(false)
    setEnEdicion(null)
  }

  const acciones: AccionesDeCredencial = {
    onAnadirCredencial: () => setAltaAbierta(true),
    onCompartirCredencial: setCompartiendo,
    onEditarCredencial: setEnEdicion,
    onEliminarCredencial: setABorrar,
    onEnlacesCredencial: setEnlacesDe,
    onEtiquetasCredencial: setEtiquetasDe,
  }

  const dialogos = (
    <>
      <CredentialFormDialog
        server={server}
        credential={enEdicion}
        open={altaAbierta || Boolean(enEdicion)}
        onOpenChange={cerrarFormulario}
      />
      <CredentialAccessSheet
        credencial={compartiendo}
        open={compartiendo !== null}
        onOpenChange={(abierto) => !abierto && setCompartiendo(null)}
        puedeRepartir={organization?.role === 'owner' || organization?.role === 'admin'}
      />
      <CredentialLinksSheet
        credential={enlacesDe}
        open={Boolean(enlacesDe)}
        onOpenChange={(abierto) => !abierto && setEnlacesDe(null)}
      />
      <CredentialLabelsDialog
        credential={etiquetasDe}
        open={Boolean(etiquetasDe)}
        onOpenChange={(abierto) => !abierto && setEtiquetasDe(null)}
      />
      <ConfirmDialog
        open={Boolean(aBorrar)}
        onOpenChange={(abierto) => !abierto && setABorrar(null)}
        titulo={`¿Eliminar ${aBorrar?.username ?? ''}?`}
        descripcion="Solo se borra de Pilot SSH. El usuario sigue existiendo en su servidor."
        detalles={aBorrar ? describeCredentialLoss(aBorrar) : []}
        confirmacion={aBorrar?.username}
        accion="Eliminar credencial"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => aBorrar && eliminar.mutate(aBorrar.id)}
      />
    </>
  )

  return { acciones, dialogos }
}
