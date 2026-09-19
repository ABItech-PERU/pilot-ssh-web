import { CalendarRangeIcon } from 'lucide-react'

import { FiltroSelect } from '@/components/filter-bar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PERIODOS, resolverPeriodo, type Periodo, type Rango } from '@/lib/periods'

/** Selector de periodo con atajos. Emite el rango ya resuelto: quien lo usa
 *  solo sabe de fechas. */
export function PeriodFilter({
  periodo,
  rango,
  onChange,
  conEtiqueta = false,
}: {
  periodo: Periodo
  rango: Rango
  onChange: (periodo: Periodo, rango: Rango) => void
  /** Con su rótulo encima, para el panel de filtros; sin él, en la fila. */
  conEtiqueta?: boolean
}) {
  const selector = (
    <FiltroSelect
      icono={CalendarRangeIcon}
      etiqueta="Periodo"
      className={conEtiqueta ? 'w-full' : undefined}
      valor={periodo}
      onChange={(valor) => {
        const siguiente = valor as Periodo
        onChange(siguiente, resolverPeriodo(siguiente) ?? rango)
      }}
      opciones={PERIODOS}
    />
  )

  if (!conEtiqueta) return selector

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Periodo</Label>
      {selector}
    </div>
  )
}

/** El «desde» y el «hasta» de un periodo personalizado. */
export function PeriodRange({
  rango,
  onChange,
  compacto = false,
}: {
  rango: Rango
  onChange: (rango: Rango) => void
  /** En una fila, sin rótulos y a un ancho fijo; en un panel, con ellos. */
  compacto?: boolean
}) {
  return (
    <>
      <Campo
        id="periodo-desde"
        etiqueta="Desde"
        compacto={compacto}
        valor={rango.from}
        max={rango.to || undefined}
        onChange={(valor) => onChange({ ...rango, from: valor })}
      />
      <Campo
        id="periodo-hasta"
        etiqueta="Hasta"
        compacto={compacto}
        valor={rango.to}
        min={rango.from || undefined}
        onChange={(valor) => onChange({ ...rango, to: valor })}
      />
    </>
  )
}

function Campo({
  id,
  etiqueta,
  compacto,
  valor,
  min,
  max,
  onChange,
}: {
  id: string
  etiqueta: string
  compacto: boolean
  valor: string
  min?: string
  max?: string
  onChange: (valor: string) => void
}) {
  const campo = (
    <Input
      id={id}
      type="date"
      className={compacto ? 'h-10! w-40' : 'h-10!'}
      aria-label={compacto ? etiqueta : undefined}
      value={valor}
      min={min}
      max={max}
      onChange={(evento) => onChange(evento.target.value)}
    />
  )

  if (compacto) return campo

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {etiqueta}
      </Label>
      {campo}
    </div>
  )
}
