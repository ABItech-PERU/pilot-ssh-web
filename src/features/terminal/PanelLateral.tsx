import { cn } from 'cn'
import { type LucideIcon, XIcon } from 'lucide-react'
import { type ReactNode, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

export interface PestanaLateral {
  id: string
  etiqueta: string
  icono: LucideIcon
  contenido: ReactNode
}

interface Props extends Omit<React.ComponentProps<'aside'>, 'children'> {
  pestanas: PestanaLateral[]
  onCerrar: () => void
}

/** El costado de la terminal, con una pestaña por herramienta. Las pestañas
 *  de atrás siguen montadas y no pierden lo que tenían. */
export function PanelLateral({ pestanas, onCerrar, className, ...props }: Props) {
  const [activa, setActiva] = useState(pestanas[0]?.id)
  const base = useId()
  const botones = useRef<Record<string, HTMLButtonElement | null>>({})

  const idDe = (pestana: string, parte: 'pestana' | 'contenido') =>
    `${base}-${parte}-${pestana}`

  const irA = (posicion: number) => {
    const destino = pestanas[(posicion + pestanas.length) % pestanas.length]
    if (!destino) return
    setActiva(destino.id)
    botones.current[destino.id]?.focus()
  }

  const conTecla = (evento: React.KeyboardEvent, posicion: number) => {
    const destinos: Record<string, number> = {
      ArrowRight: posicion + 1,
      ArrowLeft: posicion - 1,
      Home: 0,
      End: pestanas.length - 1,
    }
    const destino = destinos[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    irA(destino)
  }

  return (
    <aside
      aria-label="Panel lateral"
      className={cn('bg-term-bg text-term-text flex min-h-0 flex-col', className)}
      {...props}
    >
      <div className="border-term-border flex h-10 shrink-0 items-stretch gap-1 border-b pr-1 pl-1">
        <div
          role="tablist"
          aria-label="Herramientas"
          className="flex min-w-0 flex-1 items-stretch"
        >
          {pestanas.map((pestana, posicion) => {
            const elegida = pestana.id === activa
            const Icono = pestana.icono
            return (
              <button
                key={pestana.id}
                ref={(nodo) => {
                  botones.current[pestana.id] = nodo
                }}
                type="button"
                role="tab"
                id={idDe(pestana.id, 'pestana')}
                aria-selected={elegida}
                aria-controls={idDe(pestana.id, 'contenido')}
                tabIndex={elegida ? 0 : -1}
                onClick={() => setActiva(pestana.id)}
                onKeyDown={(evento) => conTecla(evento, posicion)}
                className={cn(
                  'relative flex items-center gap-1.5 px-2.5 text-[0.8125rem] font-medium outline-none',
                  'focus-visible:ring-term-cmd/60 rounded-sm focus-visible:ring-2 focus-visible:ring-inset',
                  // La raya marca la elegida, como las pestañas de un editor
                  'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full',
                  elegida
                    ? 'text-term-text after:bg-term-cmd'
                    : 'text-term-dim hover:text-term-text',
                )}
              >
                <Icono className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{pestana.etiqueta}</span>
              </button>
            )
          })}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cerrar el panel"
          title="Cerrar el panel (Esc)"
          onClick={onCerrar}
          className="text-term-dim hover:text-term-text size-8 shrink-0 pointer-coarse:size-10 self-center hover:bg-white/5"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {pestanas.map((pestana) => (
        <div
          key={pestana.id}
          role="tabpanel"
          id={idDe(pestana.id, 'contenido')}
          aria-labelledby={idDe(pestana.id, 'pestana')}
          hidden={pestana.id !== activa}
          className={cn(
            'min-h-0 flex-1 flex-col',
            pestana.id === activa ? 'flex' : 'hidden',
          )}
        >
          {pestana.contenido}
        </div>
      ))}
    </aside>
  )
}
