import { cn } from 'cn'
import { COLORES, resolveColor } from '@/lib/palette'

/** Donde no cabe el chip (catálogo, selector). Siempre con el nombre al
 *  lado. */
export function LabelDot({ color, className }: { color?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'size-2.5 shrink-0 rounded-full',
        COLORES[resolveColor(color)].solido,
        className,
      )}
    />
  )
}
