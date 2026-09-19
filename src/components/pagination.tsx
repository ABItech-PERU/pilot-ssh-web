import { cn } from 'cn'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

const VENTANA = 7

interface Props {
  pagina: number
  total: number
  porPagina: number
  /** El sustantivo del modulo: "servidores", "miembros", "movimientos". */
  etiqueta: string
  onCambiar: (pagina: number) => void
}

/** Paginas a mostrar: extremos fijos, vecinas de la actual y elipsis. */
export function buildPageWindow(pagina: number, ultima: number): (number | 'gap')[] {
  if (ultima <= VENTANA) {
    return Array.from({ length: ultima }, (_, indice) => indice + 1)
  }

  const paginas = new Set<number>([1, ultima, pagina])
  for (const desplazamiento of [-2, -1, 1, 2]) {
    const vecina = pagina + desplazamiento
    if (vecina > 1 && vecina < ultima) paginas.add(vecina)
  }

  const haciaDelante = () => {
    for (let numero = 2; paginas.size < VENTANA && numero < ultima; numero += 1) {
      paginas.add(numero)
    }
  }
  const haciaAtras = () => {
    for (let numero = ultima - 1; paginas.size < VENTANA && numero > 1; numero -= 1) {
      paginas.add(numero)
    }
  }

  // En un extremo sobran huecos, y se rellenan hacia el lado que tiene sitio:
  // estando en la 100, las utiles son la 95-99, no la 2-4
  if (pagina > ultima / 2) {
    haciaAtras()
    haciaDelante()
  } else {
    haciaDelante()
    haciaAtras()
  }

  const ordenadas = [...paginas].sort((uno, otro) => uno - otro)

  return ordenadas.flatMap((numero, indice) => {
    const anterior = ordenadas[indice - 1]
    return anterior !== undefined && numero - anterior > 1
      ? (['gap', numero] as const)
      : [numero]
  })
}

export function Pagination({ pagina, total, porPagina, etiqueta, onCambiar }: Props) {
  const ultima = Math.max(1, Math.ceil(total / porPagina))

  // Con una sola pagina no se pinta
  if (ultima <= 1) return null

  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-3 text-sm">
      <p className="text-muted-foreground">
        <span className="tabular-nums">
          {desde} a {hasta}
        </span>{' '}
        de <span className="tabular-nums">{total}</span> {etiqueta}
      </p>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        {buildPageWindow(pagina, ultima).map((numero, indice) =>
          numero === 'gap' ? (
            <span
              key={`gap-${indice}`}
              aria-hidden
              className="text-muted-foreground px-1"
            >
              …
            </span>
          ) : (
            <Button
              key={numero}
              variant={numero === pagina ? 'default' : 'outline'}
              size="icon-sm"
              aria-current={numero === pagina ? 'page' : undefined}
              onClick={() => onCambiar(numero)}
              className={cn('tabular-nums', numero === pagina && 'pointer-events-none')}
            >
              {numero}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon-sm"
          disabled={pagina >= ultima}
          onClick={() => onCambiar(pagina + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
