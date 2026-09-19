import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SettingsSection } from '@/components/settings-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { iconoDeEquipo } from '@/features/account/equipos'
import * as authApi from '@/features/auth/api'
import { useSession } from '@/features/auth/session'
import { getSession } from '@/features/auth/token-store'
import { toApiError } from '@/lib/api-error'
import { formatDateTime, formatRelative } from '@/lib/format'

/** Detalle del diálogo: quien confirma sabe qué equipo cierra. */
function describirSesion(sesion: authApi.Sesion, esActual: boolean) {
  return [
    `Se cierra en ${sesion.description}${sesion.ip ? ` · ${sesion.ip}` : ''}`,
    `Última actividad ${formatRelative(sesion.last_used_at).toLowerCase()}`,
    esActual
      ? 'Se sale de la aplicación en este mismo momento'
      : 'Ese equipo tendrá que volver a iniciar sesión',
  ]
}

/** Equipos con sesión abierta. Se cierra una o las demás; nunca todas de
 *  golpe, que dejaría fuera a quien lo pide. */
export function OpenSessions() {
  const cliente = useQueryClient()
  const { signOut } = useSession()
  const navegar = useNavigate()
  const [aCerrar, setACerrar] = useState<authApi.Sesion | null>(null)
  const [cerrandoOtras, setCerrandoOtras] = useState(false)
  const actual = getSession()?.sessionId ?? null

  const consulta = useQuery({
    queryKey: authApi.clavesSesion.todas,
    queryFn: authApi.fetchSessions,
  })

  const salirDeAqui = async () => {
    await signOut()
    navegar('/login', { replace: true })
  }

  const cerrarUna = useMutation({
    mutationFn: (sesion: authApi.Sesion) => authApi.closeSession(sesion.id),
    onSuccess: async (_, sesion) => {
      setACerrar(null)
      if (sesion.id === actual) {
        toast.success('Sesión cerrada.')
        await salirDeAqui()
        return
      }
      await cliente.invalidateQueries({ queryKey: authApi.clavesSesion.todas })
      toast.success('Sesión cerrada en ese equipo.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cerrarOtras = useMutation({
    mutationFn: () => authApi.closeOtherSessions(actual),
    onSuccess: async (datos) => {
      setCerrandoOtras(false)
      await cliente.invalidateQueries({ queryKey: authApi.clavesSesion.todas })
      toast.success(
        datos.revoked === 1
          ? 'Se cerró la otra sesión.'
          : `Se cerraron ${datos.revoked} sesiones.`,
      )
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const sesiones = consulta.data ?? []
  const otras = sesiones.filter((sesion) => sesion.id !== actual).length

  return (
    <>
      <SettingsSection
        titulo="Sesiones abiertas"
        accion={
          otras > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={cerrarOtras.isPending}
              onClick={() => setCerrandoOtras(true)}
            >
              Cerrar las demás
            </Button>
          )
        }
      >
        {consulta.isPending ? (
          <Cargando />
        ) : consulta.isError ? (
          <p className="text-muted-foreground p-4 text-sm">
            No se pudieron cargar las sesiones.
          </p>
        ) : sesiones.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">No hay sesiones abiertas.</p>
        ) : (
          sesiones.map((sesion) => {
            const esActual = sesion.id === actual
            const Icono = iconoDeEquipo(sesion.description)

            return (
              <div
                key={sesion.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icono className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {sesion.description}
                      {esActual && (
                        <Badge variant="secondary" className="font-normal">
                          Este equipo
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      <span title={formatDateTime(sesion.last_used_at)}>
                        Última actividad{' '}
                        {formatRelative(sesion.last_used_at).toLowerCase()}
                      </span>
                      {sesion.ip && <> · {sesion.ip}</>}
                    </span>
                  </span>
                </span>

                <Button variant="outline" size="sm" onClick={() => setACerrar(sesion)}>
                  {esActual ? 'Cerrar aquí' : 'Cerrar'}
                </Button>
              </div>
            )
          })
        )}
      </SettingsSection>

      <ConfirmDialog
        open={aCerrar !== null}
        onOpenChange={(abierto) => !abierto && setACerrar(null)}
        titulo={`¿Cerrar la sesión de ${aCerrar?.description ?? ''}?`}
        descripcion={
          aCerrar?.id === actual
            ? 'Es la sesión de este equipo, así que habrá que iniciar sesión de nuevo.'
            : 'Ese equipo tendrá que iniciar sesión de nuevo.'
        }
        detalles={aCerrar ? describirSesion(aCerrar, aCerrar.id === actual) : []}
        accion="Cerrar la sesión"
        destructiva
        pendiente={cerrarUna.isPending}
        onConfirmar={() => aCerrar && cerrarUna.mutate(aCerrar)}
      />

      <ConfirmDialog
        open={cerrandoOtras}
        onOpenChange={setCerrandoOtras}
        titulo="¿Cerrar las demás sesiones?"
        descripcion="La sesión de este equipo se mantiene abierta."
        detalles={[`${otras} equipos tendrán que iniciar sesión de nuevo`]}
        accion="Cerrar las demás"
        destructiva
        pendiente={cerrarOtras.isPending}
        onConfirmar={() => cerrarOtras.mutate()}
      />
    </>
  )
}

function Cargando() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}
