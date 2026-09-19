import { cn } from 'cn'
import { ChevronDownIcon } from 'lucide-react'

import { InfoHint } from '@/components/info-hint'

interface Props {
  id: string
  titulo: string
  /** Tras el icono: no ocupa una línea del formulario. */
  ayuda?: string
  abierta: boolean
  onToggle: () => void
  children: React.ReactNode
}

/** Plegado hasta que hace falta. */
export function OptionalSection({
  id,
  titulo,
  ayuda,
  abierta,
  onToggle,
  children,
}: Props) {
  return (
    <div className="rounded-md border">
      {/* Ayuda fuera del boton: botones anidados no son HTML valido */}
      <div className="relative">
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={id}
          onClick={onToggle}
          className="hover:bg-accent/60 focus-visible:outline-ring flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          <span>
            {titulo} <span className="text-muted-foreground font-normal">· opcional</span>
          </span>
          <ChevronDownIcon
            className={cn(
              'text-muted-foreground size-4 transition-transform',
              abierta && 'rotate-180',
            )}
          />
        </button>
        {ayuda && (
          <span className="absolute top-1/2 right-9 -translate-y-1/2">
            <InfoHint etiqueta={`Qué va en ${titulo}`}>{ayuda}</InfoHint>
          </span>
        )}
      </div>
      {abierta && (
        <div id={id} className="space-y-5 border-t p-3 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
