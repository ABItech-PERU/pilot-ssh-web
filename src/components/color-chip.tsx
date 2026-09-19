import { cn } from 'cn'
import { COLORES, resolveColor } from '@/lib/palette'

/** Etiqueta con su color de fondo y siempre con texto, para quien no
 *  distinga los tonos. Compacta, 20 px de alto: caben tres por tarjeta. */
export function ColorChip({
  color,
  className,
  children,
}: {
  color?: string
  className?: string
  children: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center rounded px-1.5 text-[11px] font-medium',
        COLORES[resolveColor(color)].relleno,
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
