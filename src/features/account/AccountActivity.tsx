import { useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { Link } from 'react-router'

import { SettingsSection } from '@/components/settings-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  clavesActividad,
  DetalleDeActividad,
  iconoDeActividad,
} from '@/features/account/actividad'
import * as authApi from '@/features/auth/api'
import { formatDateTime, formatRelative } from '@/lib/format'

/** Entradas en la ficha; el resto, en su propia página. */
const RESUMEN = 5

/** Actividad reciente de la cuenta. Es personal: no sale en la auditoría
 *  del equipo y solo la ve su dueño. */
export function AccountActivity() {
  const consulta = useQuery({
    queryKey: clavesActividad.pagina(1, RESUMEN),
    queryFn: () => authApi.fetchAccountActivity(1, RESUMEN),
  })
  const entradas = consulta.data?.results ?? []
  const hayMas = (consulta.data?.count ?? 0) > RESUMEN

  return (
    <SettingsSection
      titulo="Actividad de la cuenta"
      accion={
        hayMas && (
          <Button asChild variant="outline" size="sm">
            <Link to="/app/settings/activity">Ver toda la actividad</Link>
          </Button>
        )
      }
    >
      {consulta.isPending ? (
        <Cargando />
      ) : consulta.isError ? (
        <p className="text-muted-foreground p-4 text-sm">
          No se pudo cargar la actividad.
        </p>
      ) : entradas.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">
          Todavía no hay actividad en su cuenta.
        </p>
      ) : (
        entradas.map((entrada) => {
          const Icono = iconoDeActividad(entrada.action)

          return (
            <div key={entrada.id} className="flex items-center gap-3 p-4">
              <Icono className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{entrada.description}</span>
                <span className="text-muted-foreground block text-xs">
                  <span title={formatDateTime(entrada.created_at)}>
                    {formatRelative(entrada.created_at)}
                  </span>
                  {entrada.device && ` · ${entrada.device}`}
                  {entrada.ip_address && (
                    <>
                      {' · '}
                      <span className="font-machine">{entrada.ip_address}</span>
                    </>
                  )}
                  {entrada.detail && (
                    <>
                      {' · '}
                      <DetalleDeActividad entrada={entrada} />
                    </>
                  )}
                </span>
              </span>
            </div>
          )
        })
      )}
    </SettingsSection>
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
