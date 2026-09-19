import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import * as platformApi from '@/features/backoffice/api'
import { CompleteTopUpDialog } from '@/features/backoffice/CompleteTopUpDialog'
import { toApiError } from '@/lib/api-error'
import { formatPrice } from '@/lib/format'
import type { PlatformTopUp } from '@/types/api'

export type AccionSobreRecarga = 'complete' | 'cancel'

export interface Resolucion {
  solicitud: PlatformTopUp
  accion: AccionSobreRecarga
}

/** Acredita o cancela a mano una recarga por fuera, con confirmación:
 *  acreditar no se deshace desde aquí. */
export function TopUpResolution({
  resolucion,
  onClose,
}: {
  resolucion: Resolucion | null
  onClose: () => void
}) {
  const cliente = useQueryClient()

  const cancelar = useMutation({
    mutationFn: (solicitud: PlatformTopUp) => platformApi.cancelTopUp(solicitud.id),
    onSuccess: async (recarga) => {
      await platformApi.invalidarPlataforma(cliente)
      onClose()
      toast.success(`Recarga de ${recarga.organization.name} cancelada.`)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cancelando = resolucion?.accion === 'cancel' ? resolucion.solicitud : null
  const acreditando = resolucion?.accion === 'complete' ? resolucion.solicitud : null

  return (
    <>
      <CompleteTopUpDialog
        solicitud={acreditando}
        open={acreditando !== null}
        onOpenChange={(abierto) => !abierto && onClose()}
      />

      <ConfirmDialog
        open={cancelando !== null}
        onOpenChange={(abierto) => !abierto && onClose()}
        titulo="Cancelar la recarga"
        descripcion={
          cancelando
            ? `${cancelando.package_name} (${formatPrice(cancelando.price_amount, cancelando.price_currency)}) de ${cancelando.organization.name} deja de estar pendiente. No se acredita nada.`
            : ''
        }
        detalles={['El cliente puede pedir otra cuando quiera.']}
        accion="Cancelar la recarga"
        destructiva
        pendiente={cancelar.isPending}
        onConfirmar={() => cancelando && cancelar.mutate(cancelando)}
      />
    </>
  )
}
