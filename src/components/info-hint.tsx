import { InfoIcon } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** El porqué de un campo, tras un icono: a mano sin llenar de texto el
 *  formulario.
 *
 *  El globo, flecha incluida, usa los colores del popover para seguir el
 *  tema; el de shadcn va invertido. */
export function InfoHint({ children, etiqueta }: { children: string; etiqueta: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={etiqueta}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-full focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          <InfoIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-popover text-popover-foreground [&_svg]:bg-popover [&_svg]:fill-popover max-w-56 border shadow-md">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
