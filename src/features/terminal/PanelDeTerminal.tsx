import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import { cn } from 'cn'
import { CoinsIcon, RotateCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { CIERRE, type EstadoTerminal } from '@/features/terminal/socket'
import { useTerminalSocket } from '@/features/terminal/use-terminal-socket'
import type { Server, ServerUser } from '@/types/api'

/** Hex: xterm no entiende oklch(). Copia de los tokens `--term-*` de
 *  index.css; cambian juntos. */
const TEMA = {
  background: '#141922',
  foreground: '#ecedf1',
  cursor: '#5fd4c8',
  cursorAccent: '#141922',
  selectionBackground: 'rgba(95, 212, 200, 0.28)',
  black: '#1c222c',
  red: '#ef7272',
  green: '#63d68f',
  yellow: '#e8c86a',
  blue: '#74acf2',
  magenta: '#c896ea',
  cyan: '#5fd4c8',
  white: '#d7dae0',
  brightBlack: '#5b6270',
  brightRed: '#f78c8c',
  brightGreen: '#7fe3a6',
  brightYellow: '#f0d68a',
  brightBlue: '#94c0f7',
  brightMagenta: '#d7aef2',
  brightCyan: '#84e2d8',
  brightWhite: '#f5f6f8',
}

/** Alt+número es de las pestañas; abajo llegaría como un escape suelto. */
const CAMBIA_DE_PESTANA = /^[1-9]$/

interface PanelProps {
  id: string
  server: Server
  credencial: ServerUser
  /** Las de atrás siguen conectadas y recibiendo: solo dejan de verse. */
  visible: boolean
  onEstado: (id: string, estado: EstadoTerminal) => void
}

/** Monta xterm una vez y le ata la shell; al reconectar, lo escrito sigue
 *  en pantalla. */
export function PanelDeTerminal({
  id,
  server,
  credencial,
  visible,
  onEstado,
}: PanelProps) {
  const contenedor = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<Terminal | null>(null)
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: 'conectando' })

  const { enviarTamano, reconectar, teclear } = useTerminalSocket({
    server,
    credencial,
    terminal,
    onEstado: setEstado,
  })

  useEffect(() => {
    onEstado(id, estado)
  }, [id, estado, onEstado])

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return

    const vista = new Terminal({
      theme: TEMA,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: true,
    })
    const ajuste = new FitAddon()
    vista.loadAddon(ajuste)
    vista.loadAddon(new WebLinksAddon())
    vista.open(nodo)
    vista.attachCustomKeyEventHandler(
      (evento) => !(evento.altKey && CAMBIA_DE_PESTANA.test(evento.key)),
    )
    terminal.current = vista

    // Oculta mide cero y xterm quedaria en una fila; el ajuste espera a que
    // se vea. Y tras open el contenedor aun no tiene tamaño: va en el frame
    // siguiente
    let marco = requestAnimationFrame(() => ajuste.fit())

    const teclado = vista.onData(teclear)

    const observador = new ResizeObserver(() => {
      if (!nodo.clientWidth) return
      cancelAnimationFrame(marco)
      marco = requestAnimationFrame(() => {
        ajuste.fit()
        enviarTamano()
      })
    })
    observador.observe(nodo)

    return () => {
      cancelAnimationFrame(marco)
      observador.disconnect()
      teclado.dispose()
      vista.dispose()
      terminal.current = null
    }
  }, [enviarTamano, teclear])

  useEffect(() => {
    if (visible) terminal.current?.focus()
  }, [visible])

  return (
    <div
      className={cn('relative min-h-0 flex-1 overflow-hidden p-2', !visible && 'hidden')}
      role="tabpanel"
      aria-label={`Terminal de ${credencial.username}`}
    >
      <div ref={contenedor} className="size-full" />

      {estado.fase === 'cerrada' && (
        <div className="absolute inset-0 grid place-items-center bg-term-bg/80">
          <div className="border-term-border bg-term-bg rounded-md border px-6 py-5 text-center">
            <p className="text-sm">{estado.motivo}</p>
            <div className="mt-4 flex justify-center gap-2">
              {estado.reintentable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reconectar}
                  className="border-term-border text-term-text bg-transparent hover:bg-white/5"
                >
                  <RotateCwIcon />
                  Volver a conectar
                </Button>
              )}
              {estado.codigo === CIERRE.SIN_SALDO && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-term-border text-term-text bg-transparent hover:bg-white/5"
                >
                  <Link to="/app/credits">
                    <CoinsIcon />
                    Ver créditos
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
