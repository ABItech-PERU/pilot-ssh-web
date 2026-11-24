import { CheckIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { EstadoTerminal } from '@/features/terminal/socket'

/** Un corte más breve no se anuncia, porque ya volvió antes de notarse. */
const DEMORA_DEL_AVISO_MS = 800

/** Lo que «Reconectado» queda a la vista antes de irse. */
const VUELTA_A_LA_VISTA_MS = 2000

type Aviso = 'ninguno' | 'reconectando' | 'reconectado'

/** Sobre la terminal y sin tocar su texto, que es del usuario. Solo se ve,
 *  porque el estado de la cabecera ya lo anuncia al lector de pantalla. */
export function AvisoDeReconexion({ fase }: { fase: EstadoTerminal['fase'] }) {
  const [aviso, setAviso] = useState<Aviso>('ninguno')
  const anunciado = useRef(false)

  useEffect(() => {
    if (fase === 'reconectando') {
      const demora = window.setTimeout(() => {
        anunciado.current = true
        setAviso('reconectando')
      }, DEMORA_DEL_AVISO_MS)
      return () => window.clearTimeout(demora)
    }
    if (fase === 'conectada' && anunciado.current) {
      anunciado.current = false
      setAviso('reconectado')
      const salida = window.setTimeout(() => setAviso('ninguno'), VUELTA_A_LA_VISTA_MS)
      return () => window.clearTimeout(salida)
    }
    anunciado.current = false
    setAviso('ninguno')
  }, [fase])

  return (
    <div
      aria-hidden
      data-testid="aviso-de-reconexion"
      className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center"
    >
      {aviso !== 'ninguno' && (
        <span className="border-term-border bg-term-bg/95 text-term-text motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm">
          {aviso === 'reconectando' ? (
            <Loader2Icon className="text-term-arg size-3.5 motion-safe:animate-spin" aria-hidden />
          ) : (
            <CheckIcon className="text-term-ok size-3.5" aria-hidden />
          )}
          {aviso === 'reconectando' ? 'Reconectando…' : 'Reconectado'}
        </span>
      )}
    </div>
  )
}
