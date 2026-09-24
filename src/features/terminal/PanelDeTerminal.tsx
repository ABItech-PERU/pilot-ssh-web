import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import { cn } from 'cn'
import { CoinsIcon, RotateCwIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  BuscadorEnTerminal,
  type Coincidencias,
} from '@/features/terminal/BuscadorEnTerminal'
import { CIERRE, type EstadoTerminal } from '@/features/terminal/socket'
import { fetchPorcentaje } from '@/features/terminal/subida'
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

/** Ctrl+F lo usa la shell para avanzar el cursor: la búsqueda lleva Shift. */
const ABRE_LA_BUSQUEDA = (evento: KeyboardEvent) =>
  evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'f'

const RESALTADO = {
  matchBackground: '#3f4a5c',
  matchOverviewRuler: '#5fd4c8',
  activeMatchBackground: '#5fd4c8',
  activeMatchColorOverviewRuler: '#5fd4c8',
}

const SIN_COINCIDENCIAS: Coincidencias = { actual: 0, total: 0 }

interface PanelProps {
  id: string
  server: Server
  credencial: ServerUser
  /** Las de atrás siguen conectadas y recibiendo: solo dejan de verse. */
  visible: boolean
  onEstado: (id: string, estado: EstadoTerminal) => void
  onLatencia: (id: string, ms: number) => void
  /** Deja su subida a mano: el botón de la barra sube a la que se ve. */
  onSubidor: (id: string, subir: (archivo: File) => void) => void
}

/** Monta xterm una vez y le ata la shell; al reconectar, lo escrito sigue
 *  en pantalla. */
export function PanelDeTerminal({
  id,
  server,
  credencial,
  visible,
  onEstado,
  onLatencia,
  onSubidor,
}: PanelProps) {
  const contenedor = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<Terminal | null>(null)
  const buscador = useRef<SearchAddon | null>(null)
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: 'conectando' })
  const [buscando, setBuscando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [coincidencias, setCoincidencias] = useState<Coincidencias>(SIN_COINCIDENCIAS)

  const avisarLatencia = useCallback((ms: number) => onLatencia(id, ms), [id, onLatencia])

  const { enviarTamano, reconectar, subida, subir, teclear } = useTerminalSocket({
    server,
    credencial,
    terminal,
    onEstado: setEstado,
    onLatencia: avisarLatencia,
  })

  useEffect(() => {
    onEstado(id, estado)
  }, [id, estado, onEstado])

  useEffect(() => {
    onSubidor(id, subir)
  }, [id, onSubidor, subir])

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
    const busqueda = new SearchAddon()
    vista.loadAddon(ajuste)
    vista.loadAddon(busqueda)
    vista.loadAddon(new WebLinksAddon())
    vista.open(nodo)
    vista.attachCustomKeyEventHandler((evento) => {
      if (evento.altKey && CAMBIA_DE_PESTANA.test(evento.key)) return false
      if (!ABRE_LA_BUSQUEDA(evento)) return true
      if (evento.type === 'keydown') setBuscando(true)
      return false
    })
    terminal.current = vista
    buscador.current = busqueda

    const cuenta = busqueda.onDidChangeResults(({ resultIndex, resultCount }) =>
      setCoincidencias({ actual: resultIndex + 1, total: resultCount }),
    )

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
      cuenta.dispose()
      teclado.dispose()
      vista.dispose()
      terminal.current = null
      buscador.current = null
    }
  }, [enviarTamano, teclear])

  useEffect(() => {
    if (visible && !buscando) terminal.current?.focus()
  }, [visible, buscando])

  const buscar = (texto: string, haciaAtras: boolean) => {
    const opciones = { decorations: RESALTADO }
    if (haciaAtras) buscador.current?.findPrevious(texto, opciones)
    else buscador.current?.findNext(texto, opciones)
  }

  const cerrarBusqueda = () => {
    buscador.current?.clearDecorations()
    setCoincidencias(SIN_COINCIDENCIAS)
    setBuscando(false)
    terminal.current?.focus()
  }

  return (
    <div
      className={cn('relative min-h-0 flex-1 overflow-hidden p-2', !visible && 'hidden')}
      role="tabpanel"
      aria-label={`Terminal de ${credencial.username}`}
      onDragOver={(evento) => {
        evento.preventDefault()
        setArrastrando(true)
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(evento) => {
        evento.preventDefault()
        setArrastrando(false)
        const archivo = evento.dataTransfer.files[0]
        if (archivo) void subir(archivo)
      }}
    >
      <div ref={contenedor} className="size-full" />

      {buscando && (
        <BuscadorEnTerminal
          coincidencias={coincidencias}
          onBuscar={buscar}
          onCerrar={cerrarBusqueda}
        />
      )}

      {arrastrando && (
        <div className="bg-term-bg/85 absolute inset-2 grid place-items-center rounded-md border border-dashed border-white/25">
          <p className="text-sm">
            Suelte el archivo para copiarlo a la carpeta de trabajo
          </p>
        </div>
      )}

      {subida && (
        <div className="border-term-border bg-term-bg absolute inset-x-4 bottom-3 rounded-md border px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-machine truncate">{subida.nombre}</span>
            <span className="text-term-dim tabular-nums">
              {fetchPorcentaje(subida)} %
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-white/10">
            <div
              className="bg-term-ok h-1 rounded-full transition-[width]"
              style={{ width: `${fetchPorcentaje(subida)}%` }}
            />
          </div>
        </div>
      )}

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
