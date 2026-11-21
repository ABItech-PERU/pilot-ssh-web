import { useQuery } from '@tanstack/react-query'
import { ReceiptIcon } from 'lucide-react'
import { useOutletContext } from 'react-router'

import { Bloque, VerTodo } from '@/components/bloque'
import { EmptyState, ErrorState, LineaEsqueleto } from '@/components/states'
import * as creditsApi from '@/features/credits/api'
import type { ContextoDeCreditos } from '@/features/credits/CreditsPage'
import { conceptoDe } from '@/features/credits/movimientos'
import { Importe } from '@/features/credits/partes'
import { PendingTopUps } from '@/features/credits/PendingTopUps'
import { PricingSection } from '@/features/credits/PricingSection'
import { buildCreditsPath } from '@/features/credits/rutas'
import { UsageChart } from '@/features/credits/UsageChart'
import { formatDateTime, formatRelative } from '@/lib/format'

const MOVIMIENTOS_EN_RESUMEN = 5

/** Pendientes, marcha del mes y lo último. Las listas largas se cortan con
 *  enlace a su pestaña. */
export function CreditsSummaryTab() {
  const { slug, saldo, pendientes, continuarPago } =
    useOutletContext<ContextoDeCreditos>()

  const uso = useQuery({
    queryKey: creditsApi.clavesCreditos.uso(slug),
    queryFn: () => creditsApi.fetchUsage(slug),
  })
  const ultimos = useQuery({
    queryKey: creditsApi.clavesCreditos.movimientos(slug, 1, MOVIMIENTOS_EN_RESUMEN),
    queryFn: () => creditsApi.fetchTransactions(slug, 1, MOVIMIENTOS_EN_RESUMEN),
  })

  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <PendingTopUps
          pendientes={pendientes}
          enLinea={saldo?.online_payment ?? true}
          onPagar={continuarPago}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <UsageChart
          uso={uso.data}
          zona={saldo?.billing_time_zone}
          error={uso.error}
          onReintentar={() => uso.refetch()}
        />

        <Bloque titulo="Últimos movimientos">
          {ultimos.isError ? (
            <div className="p-4">
              <ErrorState error={ultimos.error} onRetry={() => ultimos.refetch()} />
            </div>
          ) : ultimos.isPending ? (
            <ul className="divide-y">
              {Array.from({ length: MOVIMIENTOS_EN_RESUMEN }, (_, indice) => (
                <li
                  key={indice}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div>
                    <LineaEsqueleto className="w-40" />
                    <LineaEsqueleto texto="xs" className="w-16" />
                  </div>
                  <LineaEsqueleto className="w-10" />
                </li>
              ))}
            </ul>
          ) : ultimos.data.results.length === 0 ? (
            <EmptyState
              compacto
              icon={ReceiptIcon}
              title="Sin movimientos"
              description="Aquí aparecerán las recargas y el uso de cada día."
            />
          ) : (
            <ul className="divide-y">
              {ultimos.data.results.map((movimiento) => (
                <li
                  key={movimiento.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {conceptoDe(movimiento)}
                    </span>
                    <span
                      className="text-muted-foreground block text-xs"
                      title={formatDateTime(movimiento.created_at)}
                    >
                      {formatRelative(movimiento.created_at)}
                    </span>
                  </span>
                  <Importe cantidad={movimiento.amount} />
                </li>
              ))}
            </ul>
          )}
          <VerTodo to={buildCreditsPath('transactions')}>
            Ver todos los movimientos
          </VerTodo>
        </Bloque>
      </div>

      <PricingSection zonaDeCobro={saldo?.billing_time_zone} />
    </div>
  )
}
