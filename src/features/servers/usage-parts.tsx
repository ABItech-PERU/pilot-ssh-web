import { cn } from 'cn'
import { useState } from 'react'

import { FilterBar } from '@/components/filter-bar'
import { PeriodFilter, PeriodRange } from '@/components/period-filter'
import { LineaEsqueleto } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { resolverPeriodo, type Periodo, type Rango } from '@/lib/periods'
import type { UsageStats } from '@/types/api'

/** Piezas de estadísticas de uso compartidas por máquina y credencial. */

/** 30 días: muestra el ritmo sin volver ilegible la gráfica. */
const PERIODO_DE_PARTIDA: Periodo = 'mes'

function rangoDePartida(): Rango {
  return resolverPeriodo(PERIODO_DE_PARTIDA) ?? { from: '', to: '' }
}

export function usePeriodoDeUso() {
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_DE_PARTIDA)
  const [rango, setRango] = useState<Rango>(rangoDePartida)

  return {
    periodo,
    rango,
    setRango,
    cambiar: (siguiente: Periodo, elegido: Rango) => {
      setPeriodo(siguiente)
      setRango(elegido)
    },
    hayFiltros: periodo !== PERIODO_DE_PARTIDA,
    limpiar: () => {
      setPeriodo(PERIODO_DE_PARTIDA)
      setRango(rangoDePartida())
    },
  }
}

export function BarraDePeriodo({
  estado,
  cargando,
  onActualizar,
}: {
  estado: ReturnType<typeof usePeriodoDeUso>
  cargando: boolean
  onActualizar: () => void
}) {
  return (
    <FilterBar
      hayFiltros={estado.hayFiltros}
      cargando={cargando}
      onLimpiar={estado.limpiar}
      onActualizar={onActualizar}
    >
      <PeriodFilter
        periodo={estado.periodo}
        rango={estado.rango}
        onChange={estado.cambiar}
      />
      {estado.periodo === 'personalizado' && (
        <PeriodRange rango={estado.rango} onChange={estado.setRango} compacto />
      )}
    </FilterBar>
  )
}

export function Cifra({
  icono: Icono,
  etiqueta,
  valor,
  pie,
  alerta = false,
}: {
  icono: React.ElementType
  etiqueta: string
  valor?: string
  pie: string
  alerta?: boolean
}) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icono className="size-4 shrink-0" />
        {etiqueta}
      </dt>
      <dd className="mt-2">
        {valor === undefined ? (
          <LineaEsqueleto texto="2xl" className="w-16" />
        ) : (
          <span
            className={cn(
              'text-2xl font-semibold tabular-nums',
              alerta && 'text-destructive',
            )}
          >
            {valor}
          </span>
        )}
        <span className="text-muted-foreground mt-1 block text-xs">{pie}</span>
      </dd>
    </div>
  )
}

/** Mismo alto que `ActividadDiaria`. */
export function ActividadDiariaEsqueleto() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-24 w-full" />
      <div className="flex justify-between">
        <LineaEsqueleto texto="xs" className="w-20" />
        <LineaEsqueleto texto="xs" className="w-20" />
      </div>
    </div>
  )
}

/** Alto relativo al día con más sesiones. */
export function ActividadDiaria({ datos }: { datos: UsageStats }) {
  const tope = Math.max(...datos.daily.map((dia) => dia.sessions), 1)

  return (
    <div className="space-y-2">
      <ul className="flex h-24 items-end gap-0.5">
        {datos.daily.map((dia) => (
          <li
            key={dia.date}
            className="flex h-full flex-1 items-end"
            title={`${dia.date}: ${dia.sessions} ${dia.sessions === 1 ? 'sesión' : 'sesiones'}`}
          >
            <span
              className={cn(
                'w-full rounded-sm',
                dia.sessions > 0 ? 'bg-primary' : 'bg-muted',
              )}
              style={{ height: `${Math.max((dia.sessions / tope) * 100, 4)}%` }}
            />
          </li>
        ))}
      </ul>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{datos.from}</span>
        <span>{datos.to}</span>
      </div>
    </div>
  )
}

/** Con barra: el número solo no dice si uno destaca. */
export function Ranking({
  filas,
  vacio,
}: {
  filas?: { nombre: string; total: number; maquina?: boolean }[]
  /** `EmptyState` compacto: marco del bloque. */
  vacio: React.ReactNode
}) {
  if (filas === undefined) {
    return (
      <ul className="divide-y">
        {Array.from({ length: 3 }, (_, indice) => (
          <li key={indice} className="space-y-1.5 px-4 py-3">
            <LineaEsqueleto className="w-32" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </li>
        ))}
      </ul>
    )
  }

  if (filas.length === 0) return vacio

  const tope = Math.max(...filas.map((fila) => fila.total), 1)

  return (
    <ul className="divide-y">
      {filas.map((fila) => (
        <li key={fila.nombre} className="space-y-1.5 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span
              className={cn('min-w-0 truncate text-sm', fila.maquina && 'font-machine')}
            >
              {fila.nombre}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {fila.total}
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${(fila.total / tope) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
