import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Identificador largo en una celda: se trunca y se copia con un clic. */
export function CeldaCopiable({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1600)
    } catch {
      // Sin portapapeles queda el titulo: el valor entero al pasar el cursor
    }
  }

  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="font-machine min-w-0 truncate text-xs" title={valor}>
        {valor}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copiar}
            aria-label={copiado ? 'Copiado' : `Copiar ${etiqueta}`}
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring grid size-6 shrink-0 place-items-center rounded focus-visible:-outline-offset-2 focus-visible:outline-1"
          >
            {copiado ? (
              <CheckIcon className="text-success size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{copiado ? 'Copiado' : `Copiar ${etiqueta}`}</TooltipContent>
      </Tooltip>
    </span>
  )
}
