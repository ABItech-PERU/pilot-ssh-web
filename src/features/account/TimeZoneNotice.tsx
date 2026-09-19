import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GlobeIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO, useSession } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { zonaDelNavegador } from '@/lib/zona-horaria'

const CLAVE_DESCARTADA = 'pilotssh.zona-descartada'

function leerDescartada(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_DESCARTADA)
  } catch {
    return null
  }
}

/** Equipo en otra zona que el perfil: se pregunta, una vez por zona, si
 *  cambiarla; quien viaja vería las horas de casa sin saberlo.
 *  Perfil sin zona: se toma la del equipo sin preguntar. */
export function TimeZoneNotice() {
  const { user } = useSession()
  const cliente = useQueryClient()
  const detectada = zonaDelNavegador()
  const [descartada, setDescartada] = useState(leerDescartada)
  // Una sola vez: el modo estricto repite los efectos al montar
  const tomada = useRef(false)

  const guardar = useMutation({
    mutationFn: (zona: string) => authApi.updateProfile({ time_zone: zona }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_USUARIO }),
  })
  const { mutate: fijarEnElPerfil } = guardar
  const sinZona = Boolean(user) && !user?.time_zone

  useEffect(() => {
    if (!sinZona || tomada.current) return
    tomada.current = true
    fijarEnElPerfil(detectada)
  }, [sinZona, detectada, fijarEnElPerfil])

  if (
    !user?.time_zone ||
    !user.notify_time_zone_change ||
    user.time_zone === detectada ||
    descartada === detectada
  ) {
    return null
  }

  const mantener = () => {
    setDescartada(detectada)
    try {
      window.localStorage.setItem(CLAVE_DESCARTADA, detectada)
    } catch {
      // Sin almacenamiento, se vuelve a preguntar en la próxima visita
    }
  }

  const usarLaDelEquipo = () =>
    fijarEnElPerfil(detectada, {
      onSuccess: () => toast.success(`Zona horaria cambiada a ${detectada}.`),
      onError: (error) => toast.error(toApiError(error).message),
    })

  return (
    <div
      role="status"
      className="border-primary/30 bg-primary/5 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-3"
    >
      <GlobeIcon className="text-primary size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-sm">
        Su equipo está en <span className="font-medium">{detectada}</span>; las horas se
        muestran en {user.time_zone}.
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={guardar.isPending}
        onClick={usarLaDelEquipo}
      >
        Usar {detectada}
      </Button>
      <Button variant="ghost" size="sm" onClick={mantener}>
        Mantener
      </Button>
    </div>
  )
}
