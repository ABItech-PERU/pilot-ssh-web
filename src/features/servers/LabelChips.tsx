import { cn } from 'cn'
import { ColorChip } from '@/components/color-chip'
import { MoreMenu } from '@/components/more-menu'
import { describirEtiqueta } from '@/features/servers/labels'
import { useLabelColors } from '@/features/servers/use-label-colors'

/** Siempre visibles: explican los accesos concedidos por etiqueta. Color
 *  del catálogo, nunca solo: el chip lleva el texto «clave: valor». */
export function LabelChips({
  labels,
  vacio,
  maximo,
  unaLinea,
  className,
}: {
  labels: Record<string, string>
  /** Texto sin etiquetas; si falta, no se pinta nada. */
  vacio?: string
  /** Visibles antes del «+N». */
  maximo?: number
  /** Sin salto de línea: se encogen y el resto va al «+N». */
  unaLinea?: boolean
  className?: string
}) {
  const colores = useLabelColors()
  const pares = Object.entries(labels)

  if (pares.length === 0) {
    return vacio ? <span className="text-muted-foreground text-xs">{vacio}</span> : null
  }

  // Tope: el resto va al «+N»; varias lineas de chips tapan la fila vecina
  const resume = maximo !== undefined && pares.length > maximo
  const visibles = resume ? pares.slice(0, maximo) : pares
  const resto = pares.slice(visibles.length)

  const pintar = ([clave, valor]: [string, string]) => (
    <ColorChip key={clave} color={colores[`${clave}:${valor}`]}>
      {describirEtiqueta(`${clave}:${valor}`)}
    </ColorChip>
  )

  return (
    <ul
      className={cn(
        'flex items-center gap-1',
        unaLinea ? 'flex-nowrap' : 'flex-wrap',
        className,
      )}
    >
      {visibles.map((par) => (
        // `min-w-0`: se encogen solo cuando la linea se llena
        <li key={par[0]} className="flex min-w-0">
          {pintar(par)}
        </li>
      ))}

      {resto.length > 0 && (
        <li className="flex shrink-0">
          <MoreMenu
            total={resto.length}
            descripcion={`Ver las otras ${resto.length} etiquetas`}
          >
            {resto.map(pintar)}
          </MoreMenu>
        </li>
      )}
    </ul>
  )
}
