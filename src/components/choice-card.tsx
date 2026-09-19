import { CheckIcon } from 'lucide-react'

import { cn } from 'cn'
import { InfoHint } from '@/components/info-hint'

interface Props {
  /** El redondel dice «una de estas»; la casilla, «las que quiera». */
  tipo: 'radio' | 'casilla'
  elegida: boolean
  /** Apagada, con su motivo en el pie. */
  apagada?: boolean
  titulo: string
  /** Al otro extremo del título, como el precio. */
  extremo?: React.ReactNode
  pie?: React.ReactNode
  /** Qué significa la opción, tras un icono al final de la ficha. */
  ayuda?: string
  onClick: () => void
}

/** Opción con redondel o casilla, compartida por invitar y crear una
 *  organización para que elegir se vea igual en ambos. */
export function ChoiceCard({
  tipo,
  elegida,
  apagada,
  titulo,
  extremo,
  pie,
  ayuda,
  onClick,
}: Props) {
  const esRadio = tipo === 'radio'

  const ficha = (
    <button
      type="button"
      role={esRadio ? 'radio' : 'checkbox'}
      aria-checked={elegida}
      disabled={apagada}
      onClick={onClick}
      className={cn(
        'focus-visible:outline-ring flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1',
        elegida ? 'border-primary bg-primary/5' : 'hover:border-ring',
        apagada && 'opacity-60',
        ayuda && 'pr-10',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center border',
          esRadio ? 'rounded-full' : 'rounded-sm',
          elegida ? 'border-primary text-primary' : 'border-input',
        )}
      >
        {elegida &&
          (esRadio ? (
            <span className="bg-primary size-2 rounded-full" />
          ) : (
            <CheckIcon className="size-3" />
          ))}
      </span>
      <span className="min-w-0 flex-1">
        {/* El título se trunca para no pisar el extremo */}
        <span className="flex items-baseline justify-between gap-3 text-sm font-medium">
          <span className="truncate">{titulo}</span>
          {extremo && <span className="shrink-0 tabular-nums">{extremo}</span>}
        </span>
        {pie && <span className="text-muted-foreground block text-xs">{pie}</span>}
      </span>
    </button>
  )

  if (!ayuda) return ficha

  // Fuera del botón y encima de él: un botón dentro de otro no es HTML
  // válido, y pulsar el icono marcaría la opción
  return (
    <div className="relative">
      {ficha}
      <span className="absolute top-1/2 right-3 flex -translate-y-1/2">
        <InfoHint etiqueta={`Qué significa «${titulo}»`}>{ayuda}</InfoHint>
      </span>
    </div>
  )
}
