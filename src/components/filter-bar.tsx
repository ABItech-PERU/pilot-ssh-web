import { cn } from 'cn'
import {
  ChevronDownIcon,
  FilterXIcon,
  LayoutGridIcon,
  RotateCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Table2Icon,
  XIcon,
} from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Vista } from '@/lib/use-listado'

interface FilterBarProps {
  /** Crece hasta llenar la fila, para que quepa en una sola también a lg
   *  con la barra lateral abierta. Lo que no quepa va en `avanzados`. */
  busqueda?: React.ReactNode
  /** Los filtros de uso diario, en la fila principal. */
  children: React.ReactNode
  /** Alternador de vista y tamano de pagina, empujados a la derecha. */
  derecha?: React.ReactNode
  /** Panel colapsable. Sin el, no se pinta el boton de "Filtros". */
  avanzados?: React.ReactNode
  avanzadosActivos?: number
  hayFiltros: boolean
  cargando?: boolean
  onLimpiar: () => void
  onActualizar: () => void
}

export function FilterBar({
  children,
  busqueda,
  derecha,
  avanzados,
  avanzadosActivos = 0,
  hayFiltros,
  cargando = false,
  onLimpiar,
  onActualizar,
}: FilterBarProps) {
  const [abierto, setAbierto] = useState(false)
  const idPanel = useId()

  return (
    <div className="bg-card @container rounded-lg border">
      {/* En movil los selectores comparten fila si su texto cabe; si no,
          bajan enteros. El buscador sigue al ancho de la barra, no al de la
          pantalla: en una estrecha ocupa la primera fila y los controles
          bajan juntos */}
      <div className="flex flex-wrap items-center gap-2 p-3 max-sm:[&_[data-slot=select-trigger]]:min-w-fit max-sm:[&_[data-slot=select-trigger]]:flex-1 [&>[data-slot=search]]:max-w-none @5xl:[&>[data-slot=search]]:max-w-xs @5xl:[&>[data-slot=search]]:grow @5xl:[&>[data-slot=search]]:basis-48">
        {busqueda && (
          <div className="min-w-48 max-w-xl flex-1 basis-48 sm:[&>[data-slot=search]]:max-w-none">
            {busqueda}
          </div>
        )}
        {children}

        {avanzados && (
          <Button
            variant="outline"
            size="sm"
            className="h-10!"
            aria-expanded={abierto}
            aria-controls={idPanel}
            onClick={() => setAbierto((valor) => !valor)}
          >
            <SlidersHorizontalIcon />
            Filtros
            {avanzadosActivos > 0 && (
              <span className="bg-primary text-primary-foreground grid size-4.5 place-items-center rounded-full text-[10px] font-semibold">
                {avanzadosActivos}
              </span>
            )}
            <ChevronDownIcon
              className={cn('transition-transform', abierto && 'rotate-180')}
            />
          </Button>
        )}

        {/* Un solo boton en un sitio fijo: limpia si hay filtros y si no
            recarga. Asi los demas controles no se mueven */}
        <Button
          variant="outline"
          size="icon-sm"
          className="size-10"
          onClick={hayFiltros ? onLimpiar : onActualizar}
          aria-label={hayFiltros ? 'Limpiar filtros' : 'Actualizar lista'}
        >
          {hayFiltros ? (
            <FilterXIcon className="size-4" />
          ) : (
            <RotateCwIcon className={cn('size-4', cargando && 'animate-spin')} />
          )}
        </Button>

        {derecha && <div className="ml-auto flex items-center gap-2">{derecha}</div>}
      </div>

      {avanzados && (
        <div
          id={idPanel}
          // grid-rows 0fr -> 1fr anima una altura que no se conoce de antemano
          className={cn(
            'grid transition-[grid-template-rows] duration-200',
            abierto ? 'grid-rows-[1fr] border-t' : 'grid-rows-[0fr]',
          )}
          inert={!abierto}
        >
          <div className="overflow-hidden">
            {/* Columnas segun el ancho de la barra, no de la ventana: con la
                barra lateral abierta, a lg queda el de una tablet */}
            <div className="grid gap-3 p-3 @md:grid-cols-2 @3xl:grid-cols-3">
              {avanzados}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface BusquedaProps {
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
  etiqueta: string
}

export function SearchInput({ valor, onChange, placeholder, etiqueta }: BusquedaProps) {
  const id = useId()

  return (
    <div data-slot="search" className="relative w-full sm:max-w-xs">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        id={id}
        type="search"
        value={valor}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(evento) => onChange(evento.target.value)}
        className="h-10! pl-9"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Borrar búsqueda"
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}

const VISTAS = [
  { valor: 'tabla', etiqueta: 'Ver como tabla', icono: Table2Icon },
  { valor: 'tarjetas', etiqueta: 'Ver como tarjetas', icono: LayoutGridIcon },
] as const

/** Oculto en movil: ahi la tabla siempre se ve como tarjetas. */
export function ViewToggle({
  vista,
  onChange,
}: {
  vista: Vista
  onChange: (vista: Vista) => void
}) {
  return (
    <div
      role="group"
      aria-label="Modo de vista"
      className="hidden h-10 items-center rounded-md border p-1 sm:flex"
    >
      {VISTAS.map(({ valor, etiqueta, icono: Icono }) => (
        <button
          key={valor}
          type="button"
          aria-pressed={vista === valor}
          aria-label={etiqueta}
          onClick={() => onChange(valor)}
          className={cn(
            'focus-visible:outline-ring grid size-8 place-items-center rounded transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1',
            vista === valor
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icono className="size-4" />
        </button>
      ))}
    </div>
  )
}

interface FiltroSelectProps {
  icono: React.ElementType
  /** Solo para el lector de pantalla: en pantalla lo explica el icono. */
  etiqueta: string
  valor: string
  onChange: (valor: string) => void
  opciones: readonly { valor: string; etiqueta: string }[]
  /** Para topar el ancho cuando la opcion la escribe el usuario. */
  className?: string
}

const TAMANOS = [20, 50, 100]

export function PageSizeSelect({
  valor,
  onChange,
}: {
  valor: number
  onChange: (valor: number) => void
}) {
  return (
    <Select value={String(valor)} onValueChange={(nuevo) => onChange(Number(nuevo))}>
      <SelectTrigger className="h-10! w-auto gap-2" aria-label="Filas por página">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TAMANOS.map((tamano) => (
          <SelectItem key={tamano} value={String(tamano)}>
            {tamano} por página
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Selector compacto de la fila de filtros, con icono en vez de etiqueta. */
export function FiltroSelect({
  icono: Icono,
  etiqueta,
  valor,
  onChange,
  opciones,
  className,
}: FiltroSelectProps) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger
        className={cn('h-10! w-auto gap-2', className)}
        aria-label={etiqueta}
      >
        <Icono className="text-muted-foreground size-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((opcion) => (
          <SelectItem key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
