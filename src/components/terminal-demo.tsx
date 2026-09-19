import { cn } from 'cn'
import { useEffect, useState } from 'react'

interface Segmento {
  texto: string
  clase?: string
  /** Lo tecleado sale letra a letra; la respuesta, de golpe. */
  tecleado?: boolean
}

const PROMPT: Segmento[] = [
  { texto: 'deploy', clase: 'text-term-user' },
  { texto: '@', clase: 'text-term-dim' },
  { texto: 'prod-web', clase: 'text-term-host' },
  { texto: ':~$ ', clase: 'text-term-dim' },
]

const GUION: Segmento[] = [
  { texto: '✓ ', clase: 'text-term-ok' },
  { texto: 'huella del servidor verificada\n', clase: 'text-term-dim' },
  { texto: '✓ ', clase: 'text-term-ok' },
  { texto: 'sesión abierta por ana · 14:02\n\n', clase: 'text-term-dim' },

  ...PROMPT,
  { texto: 'git', tecleado: true },
  { texto: ' pull\n', clase: 'text-term-cmd', tecleado: true },
  { texto: 'Already up to date.\n', clase: 'text-term-dim' },

  ...PROMPT,
  { texto: 'sudo', tecleado: true },
  { texto: ' systemctl restart', clase: 'text-term-cmd', tecleado: true },
  { texto: ' nginx\n', clase: 'text-term-arg', tecleado: true },

  ...PROMPT,
  { texto: 'exit\n\n', tecleado: true },

  { texto: 'sesión cerrada · ', clase: 'text-term-dim' },
  { texto: '12 min', clase: 'text-term-arg' },
  { texto: ' · queda en el registro', clase: 'text-term-dim' },
]

const FINAL = { indice: GUION.length, chars: 0 }
const MS_POR_LETRA = 38
const MS_ENTRE_RESPUESTAS = 90
const MS_ANTES_DE_REPETIR = 5000

function prefiereQuietud() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Una sesión de terminal escribiéndose, en bucle. Decorativa. */
export function TerminalDemo({ className }: { className?: string }) {
  const [sinMovimiento] = useState(prefiereQuietud)
  const [avance, setAvance] = useState(() =>
    sinMovimiento ? FINAL : { indice: 0, chars: 0 },
  )

  useEffect(() => {
    if (sinMovimiento) return

    if (avance.indice >= GUION.length) {
      const reinicio = window.setTimeout(
        () => setAvance({ indice: 0, chars: 0 }),
        MS_ANTES_DE_REPETIR,
      )
      return () => window.clearTimeout(reinicio)
    }

    const segmento = GUION[avance.indice]!
    const temporizador = window.setTimeout(
      () =>
        setAvance((actual) => {
          const enCurso = GUION[actual.indice]
          if (!enCurso) return actual
          const siguiente = enCurso.tecleado ? actual.chars + 1 : enCurso.texto.length
          return siguiente >= enCurso.texto.length
            ? { indice: actual.indice + 1, chars: 0 }
            : { indice: actual.indice, chars: siguiente }
        }),
      segmento.tecleado ? MS_POR_LETRA : MS_ENTRE_RESPUESTAS,
    )
    return () => window.clearTimeout(temporizador)
  }, [avance, sinMovimiento])

  return (
    <div
      aria-hidden
      className={cn(
        'border-term-border bg-term-bg text-term-text overflow-hidden rounded-lg border',
        className,
      )}
    >
      <div className="border-term-border text-term-dim flex items-center justify-between gap-4 border-b px-4 py-2.5 font-mono text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-term-ok size-1.5 rounded-full" />
          deploy@prod-web
        </span>
        <span className="truncate">10.0.0.5:22</span>
      </div>

      {/* Alto reservado: no crece al escribir. En móvil, líneas partidas */}
      <pre className="min-h-80 p-4 font-mono text-[12px] leading-[1.8] whitespace-pre-wrap sm:min-h-60 sm:text-[12.5px]">
        {GUION.map((segmento, indice) => {
          const visible =
            indice < avance.indice
              ? segmento.texto
              : indice === avance.indice
                ? segmento.texto.slice(0, avance.chars)
                : ''
          return visible ? (
            <span key={indice} className={segmento.clase}>
              {visible}
            </span>
          ) : null
        })}
        <span
          className={cn(
            'bg-term-cmd/80 inline-block h-[1em] w-[0.55em] translate-y-[0.15em]',
            !sinMovimiento && 'cursor-terminal',
          )}
        />
      </pre>
    </div>
  )
}
