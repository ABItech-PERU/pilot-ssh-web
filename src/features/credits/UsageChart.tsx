import { cn } from 'cn'
import { ActivityIcon } from 'lucide-react'

import { Bloque, VerTodo } from '@/components/bloque'
import { EmptyState, ErrorState, LineaEsqueleto } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { buildCreditsPath } from '@/features/credits/rutas'
import {
  DIAS_DEL_GRAFICO,
  serieDelUltimoMes,
  type SerieDeUso,
} from '@/features/credits/uso'
import type { DailyUsage } from '@/types/api'

/** Gasto diario del último mes. Los días gratuitos con uso van en claro. */
export function UsageChart({
  uso,
  zona,
  error,
  onReintentar,
}: {
  uso?: DailyUsage[]
  /** Zona del día de cobro: cada barra es un día de esa zona. */
  zona?: string
  error: unknown
  onReintentar: () => void
}) {
  return (
    <Bloque titulo={`Uso de los últimos ${DIAS_DEL_GRAFICO} días`}>
      <div className="p-4">
        {error ? (
          <ErrorState error={error} onRetry={onReintentar} />
        ) : uso === undefined || zona === undefined ? (
          <BarrasEsqueleto />
        ) : (
          <Barras serie={serieDelUltimoMes(uso, new Date(), zona)} />
        )}
      </div>
      <VerTodo to={buildCreditsPath('usage')}>Ver el uso por periodo</VerTodo>
    </Bloque>
  )
}

/** Mismo alto que `Barras`: barras, fechas y leyenda. */
export function BarrasEsqueleto() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full" />
      <div className="flex justify-between">
        <LineaEsqueleto texto="xs" className="w-12" />
        <LineaEsqueleto texto="xs" className="w-12" />
      </div>
      <div className="flex gap-x-4">
        <LineaEsqueleto texto="xs" className="w-20" />
        <LineaEsqueleto texto="xs" className="w-28" />
      </div>
    </div>
  )
}

export function Barras({ serie }: { serie: SerieDeUso }) {
  if (!serie.barras.some((barra) => barra.usado)) {
    return (
      <EmptyState
        compacto
        icon={ActivityIcon}
        title="Sin uso en el periodo"
        description="Nadie ha abierto una terminal en este tiempo."
      />
    )
  }

  // Alto relativo a la barra más cara
  const tope = Math.max(...serie.barras.map((barra) => barra.creditos), 1)

  return (
    <div className="space-y-3">
      <ul aria-label="Créditos de cada barra" className="flex h-28 items-end gap-0.5">
        {serie.barras.map((barra) => (
          <li
            key={barra.clave}
            className="flex h-full flex-1 items-end"
            title={barra.etiqueta}
          >
            <span className="sr-only">{barra.etiqueta}</span>
            <span
              aria-hidden
              className={cn(
                'w-full rounded-sm',
                barra.creditos > 0
                  ? 'bg-primary'
                  : barra.usado
                    ? 'bg-primary/30'
                    : 'bg-muted',
              )}
              style={{ height: `${alturaDe(barra, tope)}%` }}
            />
          </li>
        ))}
      </ul>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{serie.desde}</span>
        <span>{serie.hasta}</span>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Leyenda color="bg-primary">Con cobro</Leyenda>
        <Leyenda color="bg-primary/30">Dentro de lo gratuito</Leyenda>
      </div>
    </div>
  )
}

/** Usada y gratuita: misma altura que la mínima con cobro; la distingue
 *  el color. */
function alturaDe(barra: { creditos: number; usado: boolean }, tope: number): number {
  if (barra.creditos > 0) return Math.max((barra.creditos / tope) * 100, 8)
  return barra.usado ? 8 : 3
}

function Leyenda({ color, children }: { color: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('size-2.5 rounded-sm', color)} />
      {children}
    </span>
  )
}
