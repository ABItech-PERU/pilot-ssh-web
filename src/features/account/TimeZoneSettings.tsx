import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BellIcon, GlobeIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from '@/components/settings-section'
import { AccountTimeZoneDialog } from '@/features/account/AccountFieldDialog'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { describirZona, zonaDelNavegador } from '@/lib/zona-horaria'
import type { CurrentUser } from '@/types/api'

/** Todo se guarda en UTC y se lee en la zona del perfil, que no cambia sola
 *  al viajar. */
export function TimeZoneSettings({ user }: { user: CurrentUser }) {
  const cliente = useQueryClient()
  const [cambiando, setCambiando] = useState(false)
  const zona = describirZona(user.time_zone || zonaDelNavegador())

  const avisar = useMutation({
    mutationFn: (activar: boolean) =>
      authApi.updateProfile({ notify_time_zone_change: activar }),
    onSuccess: async (_, activar) => {
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success(activar ? 'Aviso activado.' : 'Aviso desactivado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <>
      <SettingsSection titulo="Región">
        <SettingsRow
          icono={GlobeIcon}
          etiqueta="Zona horaria"
          pista="Con ella se leen las horas y se cortan los días."
          onEditar={() => setCambiando(true)}
        >
          <span className="text-foreground" title={zona.region}>
            {zona.ciudad}
          </span>{' '}
          · {zona.desfase} · {zona.hora}
        </SettingsRow>
        {/* Refleja lo elegido mientras se guarda: esperar al servidor
            parecería un clic perdido */}
        <SettingsSwitchRow
          icono={BellIcon}
          etiqueta="Aviso de cambio de zona"
          pista="Si su equipo está en otra zona, se le pregunta si cambiarla."
          activado={
            avisar.isPending ? Boolean(avisar.variables) : user.notify_time_zone_change
          }
          onCambiar={(activar) => avisar.mutate(activar)}
        />
      </SettingsSection>

      <AccountTimeZoneDialog user={user} open={cambiando} onOpenChange={setCambiando} />
    </>
  )
}
