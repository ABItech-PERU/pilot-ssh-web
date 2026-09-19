import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useOutlet } from 'react-router'

import { PageHeader } from '@/components/states'
import { TabNav } from '@/components/tab-nav'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { atiende, llevaFinanzas } from '@/features/backoffice/permisos'
import {
  buildOperationsPath,
  type PestanaDeOperaciones,
} from '@/features/backoffice/rutas'

/** Recuento periódico de lo que pide atención, sin esperar a recargar. */
const MS_RESUMEN = 60_000

/** Avisos de pago, correos y tareas. Cada pestaña, según permisos; las
 *  tareas, para todo el personal. */
export function OperationsPage() {
  const { user } = useSession()
  const pestanaAbierta = useOutlet()

  const resumen = useQuery({
    queryKey: platformApi.clavesPlataforma.resumenDeOperaciones(),
    queryFn: platformApi.fetchOperationsSummary,
    refetchInterval: MS_RESUMEN,
  })

  const pestanas: {
    pestana: PestanaDeOperaciones
    etiqueta: string
    visible: boolean
    cuenta: number | null | undefined
  }[] = [
    {
      pestana: 'payments',
      etiqueta: 'Avisos de pago',
      visible: llevaFinanzas(user),
      cuenta: resumen.data?.payment_notices_failed,
    },
    {
      pestana: 'emails',
      etiqueta: 'Correos',
      visible: atiende(user),
      cuenta: resumen.data?.emails_failed,
    },
    {
      pestana: 'tasks',
      etiqueta: 'Tareas programadas',
      visible: true,
      cuenta: resumen.data?.tasks_needing_attention,
    },
  ]
  const visibles = pestanas.filter((pestana) => pestana.visible)

  // Sin pestaña elegida, la primera visible
  if (!pestanaAbierta && visibles[0])
    return <Navigate to={buildOperationsPath(visibles[0].pestana)} replace />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operaciones"
        description="Lo que el sistema hace solo: avisos de pago, correos y tareas programadas."
      />
      <TabNav
        etiqueta="Secciones de operaciones"
        pestanas={visibles.map((pestana) => ({
          to: buildOperationsPath(pestana.pestana),
          etiqueta: pestana.etiqueta,
          // Sin ceros: solo cuenta lo que pide atención
          cuenta: pestana.cuenta || null,
        }))}
      />
      <Outlet />
    </div>
  )
}
