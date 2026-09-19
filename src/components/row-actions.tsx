import { EllipsisVerticalIcon, EyeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Acciones de una fila en dos iconos: el ojo abre la ficha y los tres
 *  puntos guardan el resto. Dentro van `DropdownMenuItem`. */
export function RowActions({
  etiqueta,
  onVerDetalle,
  children,
}: {
  /** De qué fila son, ya en genitivo, para el lector de pantalla:
   *  «de Acme», «de la recarga de Acme». */
  etiqueta: string
  onVerDetalle: () => void
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ver detalle ${etiqueta}`}
            onClick={onVerDetalle}
          >
            <EyeIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver detalle</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones ${etiqueta}`}>
            <EllipsisVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}
