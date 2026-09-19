import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailIcon, SendIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SettingsSection } from '@/components/settings-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as membersApi from '@/features/members/api'
import { toApiError } from '@/lib/api-error'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { Invitation } from '@/types/api'

/** Invitaciones sin aceptar, aparte del equipo: aún no son miembros. Aquí
 *  se ven, se reenvían o se cancelan. */
export function PendingInvitations({ slug }: { slug: string }) {
  const cliente = useQueryClient()
  const [aCancelar, setACancelar] = useState<Invitation | null>(null)

  const consulta = useQuery({
    queryKey: membersApi.clavesEquipo.invitaciones(slug),
    queryFn: () => membersApi.fetchInvitations(slug),
  })

  const refrescar = async () => {
    await cliente.invalidateQueries({ queryKey: ['invitations'] })
  }

  const reenviar = useMutation({
    mutationFn: (invitacion: Invitation) =>
      membersApi.resendInvitation(slug, invitacion.id),
    onSuccess: async (invitacion) => {
      await refrescar()
      toast.success(`Invitación reenviada a ${invitacion.email}.`)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cancelar = useMutation({
    mutationFn: (invitacion: Invitation) =>
      membersApi.revokeInvitation(slug, invitacion.id),
    onSuccess: async () => {
      await refrescar()
      setACancelar(null)
      toast.success('Invitación cancelada.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const invitaciones = consulta.data ?? []
  if (invitaciones.length === 0) return null

  return (
    <>
      <SettingsSection
        titulo="Invitaciones sin aceptar"
        accion={
          <span className="text-muted-foreground text-xs tabular-nums">
            {invitaciones.length}
          </span>
        }
      >
        {invitaciones.map((invitacion) => (
          <div
            key={invitacion.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <span className="flex min-w-0 items-center gap-3">
              <MailIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0">
                <span className="font-machine block truncate text-sm font-medium">
                  {invitacion.email}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {invitacion.role_label}
                  {' · '}
                  <span title={formatDateTime(invitacion.expires_at)}>
                    caduca {formatRelative(invitacion.expires_at).toLowerCase()}
                  </span>
                </span>
              </span>
            </span>

            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                Sin aceptar
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={reenviar.isPending}
                onClick={() => reenviar.mutate(invitacion)}
              >
                <SendIcon />
                Reenviar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Cancelar la invitación de ${invitacion.email}`}
                onClick={() => setACancelar(invitacion)}
              >
                <XIcon />
              </Button>
            </span>
          </div>
        ))}
      </SettingsSection>

      <ConfirmDialog
        open={aCancelar !== null}
        onOpenChange={(abierto) => !abierto && setACancelar(null)}
        titulo="¿Cancelar la invitación?"
        descripcion={`El enlace que recibió ${aCancelar?.email ?? ''} dejará de servir.`}
        detalles={['Se puede volver a invitar a ese correo cuando quiera']}
        accion="Cancelar la invitación"
        destructiva
        pendiente={cancelar.isPending}
        onConfirmar={() => aCancelar && cancelar.mutate(aCancelar)}
      />
    </>
  )
}
