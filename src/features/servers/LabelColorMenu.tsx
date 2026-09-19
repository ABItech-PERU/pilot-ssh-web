import { CheckIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from 'cn'
import { COLORES, NOMBRES } from '@/lib/palette'
import type { PaletteColor } from '@/types/api'

/** Menú y no hilera de puntos: nombre, papelera y nueve colores no caben
 *  en una fila. */
export function LabelColorMenu({
  color,
  opcion,
  onChange,
}: {
  color: PaletteColor
  opcion: string
  onChange: (color: PaletteColor) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Color de ${opcion}`}>
          <span className={cn('size-3.5 rounded-full', COLORES[color].solido)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="grid w-auto grid-cols-3 gap-1 p-2">
        {NOMBRES.map((nombre) => (
          <DropdownMenuItem
            key={nombre}
            aria-label={COLORES[nombre].etiqueta}
            className="justify-center p-1"
            onSelect={() => onChange(nombre)}
          >
            <span
              className={cn(
                'grid size-6 place-items-center rounded-full',
                COLORES[nombre].solido,
              )}
            >
              {nombre === color && <CheckIcon className="size-3.5 text-white" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
