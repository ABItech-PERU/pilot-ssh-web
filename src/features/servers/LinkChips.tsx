import { cn } from 'cn'
import { ExternalLinkIcon } from 'lucide-react'

import { MoreMenu } from '@/components/more-menu'
import { isSafeHref, TIPOS_DE_ENLACE } from '@/features/servers/links'
import type { ResourceLink } from '@/types/api'

/** - `chips`: en hilera, para celda o cabecera.
 *  - `columna`: apilados dentro de una fila desplegable.
 *  - `filas`: lista de bloque, igual que las filas de credencial. */
type Presentacion = 'chips' | 'columna' | 'filas'

interface Props {
  links: ResourceLink[]
  /** Texto sin enlaces; si falta, no se pinta nada. */
  vacio?: string
  /** Visibles antes del «+N». */
  maximo?: number
  presentacion?: Presentacion
  className?: string
}

/** Sin id y con URL repetibles: el índice los distingue. */
function claveDeEnlace(enlace: ResourceLink, indice: number) {
  return `${indice}-${enlace.url}`
}

/** Abren en otra pestaña. Un href no http(s) no se pinta (segunda
 *  barrera tras la API). */
export function LinkChips({
  links,
  vacio,
  maximo,
  presentacion = 'chips',
  className,
}: Props) {
  const seguros = links.filter((enlace) => isSafeHref(enlace.url))

  if (seguros.length === 0) {
    return vacio ? <span className="text-muted-foreground text-xs">{vacio}</span> : null
  }

  if (presentacion === 'filas') {
    return (
      <ul className={cn('divide-y', className)}>
        {seguros.map((enlace, indice) => (
          <li key={claveDeEnlace(enlace, indice)}>
            <Fila enlace={enlace} />
          </li>
        ))}
      </ul>
    )
  }

  const enColumna = presentacion === 'columna'
  // Tope estricto: un enlace es ancho y uno de mas abre otra linea
  const resume = maximo !== undefined && seguros.length > maximo
  const visibles = resume ? seguros.slice(0, maximo) : seguros
  const resto = seguros.slice(visibles.length)

  return (
    <ul
      className={cn(
        'flex gap-1',
        enColumna ? 'flex-col items-stretch' : 'flex-wrap items-center',
        className,
      )}
    >
      {visibles.map((enlace, indice) => (
        <li key={claveDeEnlace(enlace, indice)} className="flex min-w-0">
          <Enlace
            enlace={enlace}
            acotado={maximo !== undefined && !enColumna}
            aLoAncho={enColumna}
          />
        </li>
      ))}

      {resto.length > 0 && (
        <li className="flex shrink-0">
          <MoreMenu
            total={resto.length}
            descripcion={`Ver los otros ${resto.length} enlaces`}
          >
            {resto.map((enlace, indice) => (
              <Enlace
                key={claveDeEnlace(enlace, visibles.length + indice)}
                enlace={enlace}
              />
            ))}
          </MoreMenu>
        </li>
      )}
    </ul>
  )
}

/** Acotado en fila estrecha, para que el «+N» no salte de línea. A lo
 *  ancho, con el glifo de salida a la derecha. */
function Enlace({
  enlace,
  acotado = false,
  aLoAncho = false,
}: {
  enlace: ResourceLink
  acotado?: boolean
  aLoAncho?: boolean
}) {
  const { icono: Icono } = TIPOS_DE_ENLACE[enlace.kind] ?? TIPOS_DE_ENLACE.other

  return (
    <a
      href={enlace.url}
      target="_blank"
      rel="noopener noreferrer"
      title={enlace.label}
      className={cn(
        'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring inline-flex items-center gap-1 rounded text-[11px] transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1',
        aLoAncho ? 'h-7 w-full justify-between px-2' : 'h-5 px-1.5',
        acotado ? 'max-w-36' : 'max-w-full',
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <Icono className="size-3 shrink-0" />
        <span className="truncate">{enlace.label}</span>
      </span>
      <ExternalLinkIcon className="size-2.5 shrink-0 opacity-60" />
    </a>
  )
}

/** Mismo alto y aire que una fila de credencial. */
function Fila({ enlace }: { enlace: ResourceLink }) {
  const { icono: Icono } = TIPOS_DE_ENLACE[enlace.kind] ?? TIPOS_DE_ENLACE.other

  return (
    <a
      href={enlace.url}
      target="_blank"
      rel="noopener noreferrer"
      title={enlace.label}
      className="hover:bg-accent focus-visible:outline-ring flex items-center gap-3 px-4 py-3 text-sm transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1"
    >
      <Icono className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{enlace.label}</span>
      <ExternalLinkIcon className="text-muted-foreground size-3.5 shrink-0" />
    </a>
  )
}
