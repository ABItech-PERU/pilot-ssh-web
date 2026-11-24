import { cn } from 'cn'
import { useRef, useState } from 'react'

interface Props {
  ancho: number
  minimo: number
  maximo: number
  /** El id del panel que cambia de ancho. */
  controla: string
  onCambiar: (ancho: number) => void
  /** Al soltar o tras cada tecla, para recordar el ancho. */
  onTerminar: () => void
  onReiniciar: () => void
}

const PASO = 16
const PASO_LARGO = 64

/** La línea entre la terminal y el panel, que se arrastra como en VS Code.
 *  Con el teclado sigue el patrón «window splitter» de WAI-ARIA. */
export function DivisorDePanel({
  ancho,
  minimo,
  maximo,
  controla,
  onCambiar,
  onTerminar,
  onReiniciar,
}: Props) {
  const inicio = useRef<{ x: number; ancho: number } | null>(null)
  const [arrastrando, setArrastrando] = useState(false)

  const soltar = () => {
    if (!inicio.current) return
    inicio.current = null
    setArrastrando(false)
    document.body.classList.remove('arrastrando-divisor')
    onTerminar()
  }

  const conTecla = (evento: React.KeyboardEvent) => {
    const paso = evento.shiftKey ? PASO_LARGO : PASO
    // El panel está a la derecha, así que ir a la izquierda lo ensancha
    const destinos: Record<string, number> = {
      ArrowLeft: ancho + paso,
      ArrowRight: ancho - paso,
      Home: minimo,
      End: maximo,
    }
    const destino = destinos[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    onCambiar(Math.min(Math.max(destino, minimo), maximo))
    onTerminar()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Ancho del panel"
      aria-controls={controla}
      aria-valuenow={ancho}
      aria-valuemin={minimo}
      aria-valuemax={maximo}
      tabIndex={0}
      title="Arrastre para cambiar el ancho. Doble clic lo devuelve al inicial."
      data-arrastrando={arrastrando || undefined}
      className={cn(
        'bg-term-border relative z-10 w-px shrink-0 cursor-col-resize touch-none outline-none',
        // Se agarra en 9 px aunque se vea de uno
        "before:absolute before:inset-y-0 before:-right-1 before:-left-1 before:content-['']",
        'hover:bg-term-cmd/70 focus-visible:bg-term-cmd data-[arrastrando]:bg-term-cmd transition-colors hover:delay-150',
      )}
      onPointerDown={(evento) => {
        if (evento.button !== 0) return
        evento.preventDefault()
        inicio.current = { x: evento.clientX, ancho }
        try {
          evento.currentTarget.setPointerCapture(evento.pointerId)
        } catch {
          // Sin captura el arrastre sigue, solo que se corta al salir del divisor
        }
        setArrastrando(true)
        document.body.classList.add('arrastrando-divisor')
      }}
      onPointerMove={(evento) => {
        if (!inicio.current) return
        const nuevo = inicio.current.ancho + inicio.current.x - evento.clientX
        onCambiar(Math.min(Math.max(nuevo, minimo), maximo))
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
      onDoubleClick={onReiniciar}
      onKeyDown={conTecla}
    />
  )
}
