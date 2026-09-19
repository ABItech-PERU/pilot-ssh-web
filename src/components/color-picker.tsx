import { CheckIcon } from 'lucide-react'

import { cn } from 'cn'
import { COLORES, NOMBRES } from '@/lib/palette'
import type { PaletteColor } from '@/types/api'

/** Paleta del avatar de organización y de las opciones de etiqueta. El
 *  elegido lleva marca además del anillo, para quien no distingue colores. */
export function ColorPicker({
  color,
  descripcion,
  onChange,
}: {
  color: PaletteColor
  descripcion: string
  onChange: (color: PaletteColor) => void
}) {
  return (
    <div role="radiogroup" aria-label={descripcion} className="flex flex-wrap gap-2">
      {NOMBRES.map((nombre) => (
        <button
          key={nombre}
          type="button"
          role="radio"
          aria-checked={color === nombre}
          aria-label={COLORES[nombre].etiqueta}
          onClick={() => onChange(nombre)}
          className={cn(
            'focus-visible:outline-ring ring-offset-background grid size-7 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2',
            COLORES[nombre].solido,
            color === nombre && 'ring-foreground ring-2 ring-offset-2',
          )}
        >
          {color === nombre && <CheckIcon className="size-3.5 text-white" />}
        </button>
      ))}
    </div>
  )
}
