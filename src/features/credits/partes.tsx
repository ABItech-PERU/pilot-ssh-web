import { cn } from 'cn'
import { CalendarRangeIcon, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { FiltroSelect } from '@/components/filter-bar'
import { PeriodRange } from '@/components/period-filter'
import { Badge } from '@/components/ui/badge'
import { LineaEsqueleto } from '@/components/states'
import type { LadoDelMovimiento } from '@/features/credits/movimientos'
import type { TonoDeRecarga } from '@/features/credits/recargas'
import type { Tono } from '@/features/credits/saldo'
import { formatCredits, formatDateTime, formatRelative } from '@/lib/format'
import { PERIODOS, resolverPeriodo, type Periodo, type Rango } from '@/lib/periods'
import type { useListado } from '@/lib/use-listado'

/** Piezas comunes a las pestañas de créditos. */

export const COLOR_DEL_TONO: Record<Tono, string> = {
  normal: '',
  aviso: 'text-warning',
  peligro: 'text-destructive',
}

/** Fondo y texto por tono, para insignias e iconos. */
export const TINTE: Record<TonoDeRecarga, string> = {
  aviso: 'bg-warning/15 text-warning',
  proceso: 'bg-primary/15 text-primary',
  ok: 'bg-success/15 text-success',
  neutro: 'bg-muted text-muted-foreground',
  // Celeste fuera de la paleta a propósito: una devolución se distingue
  // de lejos de lo cancelado
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  peligro: 'bg-destructive/15 text-destructive',
}

/** Cifra con icono, su significado y, si hace falta, una insignia. */
export function Cifra({
  icono: Icono,
  etiqueta,
  valor,
  unidad = 'créditos',
  pie,
  tono = 'normal',
  insignia,
}: {
  icono: LucideIcon
  etiqueta: string
  valor?: string
  /** Vacía si no son créditos: días, personas. */
  unidad?: string
  pie?: string
  tono?: Tono
  insignia?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-4">
      {/* Alto fijo de insignia: sin salto al llegar */}
      <dt className="text-muted-foreground flex h-5.5 items-center gap-2 text-xs">
        <Icono className="size-4 shrink-0" />
        {etiqueta}
        {insignia && <span className="ml-auto">{insignia}</span>}
      </dt>
      <dd className="mt-2 space-y-1">
        {valor === undefined ? (
          <LineaEsqueleto texto="2xl" className="w-24" />
        ) : (
          <p>
            <span
              className={cn('text-2xl font-semibold tabular-nums', COLOR_DEL_TONO[tono])}
            >
              {valor}
            </span>
            {unidad && <span className="text-muted-foreground text-sm"> {unidad}</span>}
          </p>
        )}
        {pie === undefined ? (
          <LineaEsqueleto texto="xs" className="w-36" />
        ) : (
          <p className="text-muted-foreground text-xs">{pie}</p>
        )}
      </dd>
    </div>
  )
}

/** Lo que entra, en verde y con signo, para separarlo del uso. */
export function Importe({ cantidad }: { cantidad: string }) {
  const entra = Number(cantidad) > 0

  return (
    <span className={cn('font-medium tabular-nums', entra && 'text-success')}>
      {entra && '+'}
      {formatCredits(cantidad)}
    </span>
  )
}

const TINTE_DEL_LADO: Record<LadoDelMovimiento, string> = {
  entra: TINTE.ok,
  sale: TINTE.neutro,
  devuelve: TINTE.info,
  corrige: TINTE.aviso,
}

export function LadoBadge({
  lado,
  etiqueta,
}: {
  lado: LadoDelMovimiento
  etiqueta: string
}) {
  return (
    <Badge className={cn('border-transparent', TINTE_DEL_LADO[lado])}>{etiqueta}</Badge>
  )
}

export function EstadoBadge({
  tono,
  etiqueta,
}: {
  tono: TonoDeRecarga
  etiqueta: string
}) {
  return <Badge className={cn('border-transparent', TINTE[tono])}>{etiqueta}</Badge>
}

/** Hora exacta y el «hace» debajo: un libro se consulta por la fecha. */
export function FechaCelda({ iso }: { iso: string }) {
  return (
    <span className="block">
      {/* Se dobla para no pisar la celda vecina en tablas estrechas */}
      <span className="block text-sm whitespace-normal">{formatDateTime(iso)}</span>
      <span className="text-muted-foreground block text-xs">{formatRelative(iso)}</span>
    </span>
  )
}

/** Los atajos más el libro entero, que se consulta sin acotar. */
export type PeriodoDeCreditos = Periodo | 'todo'

const PERIODOS_DE_CREDITOS: { valor: PeriodoDeCreditos; etiqueta: string }[] = [
  { valor: 'todo', etiqueta: 'Desde el principio' },
  ...PERIODOS,
]

export function resolverPeriodoDeCreditos(periodo: PeriodoDeCreditos): Rango | null {
  return periodo === 'todo' ? { from: '', to: '' } : resolverPeriodo(periodo)
}

type ListadoConPeriodo = ReturnType<typeof useListado<{ from: string; to: string }>>

/** El atajo vive aquí; las fechas, en los filtros del listado, que son
 *  las que viajan. */
export function usePeriodoDeListado(
  listado: ListadoConPeriodo,
  porDefecto: PeriodoDeCreditos,
) {
  const [periodo, setPeriodo] = useState<PeriodoDeCreditos>(porDefecto)

  return {
    periodo,
    rango: { from: listado.filtros.from, to: listado.filtros.to },
    cambiar: (siguiente: PeriodoDeCreditos, rango: Rango) => {
      setPeriodo(siguiente)
      listado.setFiltro('from', rango.from)
      listado.setFiltro('to', rango.to)
    },
    limpiar: () => {
      setPeriodo(porDefecto)
      listado.limpiarFiltros()
    },
  }
}

export function FiltroDePeriodo({
  periodo,
  rango,
  onChange,
  className,
}: {
  periodo: PeriodoDeCreditos
  rango: Rango
  onChange: (periodo: PeriodoDeCreditos, rango: Rango) => void
  /** Tope de ancho dentro del panel de filtros. */
  className?: string
}) {
  return (
    <>
      <FiltroSelect
        icono={CalendarRangeIcon}
        etiqueta="Periodo"
        className={className}
        valor={periodo}
        onChange={(valor) => {
          const siguiente = valor as PeriodoDeCreditos
          onChange(siguiente, resolverPeriodoDeCreditos(siguiente) ?? rango)
        }}
        opciones={PERIODOS_DE_CREDITOS}
      />
      {periodo === 'personalizado' && (
        <PeriodRange
          rango={rango}
          onChange={(siguiente) => onChange('personalizado', siguiente)}
          compacto
        />
      )}
    </>
  )
}

/** Fila de ficha: etiqueta a la izquierda y dato a la derecha. */
export function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
      <dt className="text-muted-foreground shrink-0">{etiqueta}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}
