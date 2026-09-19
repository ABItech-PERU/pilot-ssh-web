import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import * as membersApi from '@/features/members/api'
import type { InvitationPreview } from '@/types/api'

/** Invitación vigente, con el testigo que la acepta. */
export type InvitacionPendiente = InvitationPreview & { token: string }

/** Quien entra desde la invitación ya aceptó: al volver se acepta sola. */
export interface VueltaALaInvitacion {
  unirse: true
}

/** Invitación de `?invitacion=`: la URL la conserva entre registro y
 *  acceso. Si no es válida, se ignora. */
export function useInvitacionDeLaUrl(): {
  invitacion: InvitacionPendiente | null
  cargando: boolean
} {
  const [parametros] = useSearchParams()
  const token = parametros.get('invitacion')

  const consulta = useQuery({
    queryKey: membersApi.clavesEquipo.invitacion(token ?? ''),
    queryFn: () => membersApi.fetchInvitation(token!),
    enabled: Boolean(token),
    retry: false,
  })

  return {
    invitacion:
      token && consulta.data?.can_be_accepted ? { ...consulta.data, token } : null,
    cargando: Boolean(token) && consulta.isPending,
  }
}

/** Enlace a registro o acceso que conserva la invitación. */
export function conInvitacion(ruta: string, token: string | null | undefined): string {
  return token ? `${ruta}?invitacion=${encodeURIComponent(token)}` : ruta
}
