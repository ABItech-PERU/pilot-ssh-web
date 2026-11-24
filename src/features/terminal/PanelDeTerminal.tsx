import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import { cn } from 'cn'
import { CoinsIcon, FolderIcon, RotateCwIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  BuscadorEnTerminal,
  type Coincidencias,
} from '@/features/terminal/BuscadorEnTerminal'
import { leerDelPrompt, leerOsc7 } from '@/features/terminal/carpeta-actual'
import { PanelDeArchivos } from '@/features/terminal/PanelDeArchivos'
import { CIERRE, type EstadoTerminal, quotePath } from '@/features/terminal/socket'
import { DialogoDeConflicto } from '@/features/terminal/DialogoDeConflicto'
import { DivisorDePanel } from '@/features/terminal/DivisorDePanel'
import {
  ANCHO_INICIAL,
  ANCHO_MINIMO,
  fetchAnchoMaximo,
  guardarAncho,
  leerAncho,
  limitarAncho,
  useHayLugarAlLado,
} from '@/features/terminal/panel-lateral'
import { PanelLateral } from '@/features/terminal/PanelLateral'
import { PanelDeTransferencias } from '@/features/terminal/PanelDeTransferencias'
import { leerSoltados } from '@/features/terminal/soltar'
import { fetchCarpetaDeLaRuta } from '@/features/terminal/subida'
import { planearSubida } from '@/features/terminal/transferencias'
import {
  type Latencias,
  useTerminalSocket,
} from '@/features/terminal/use-terminal-socket'
import type { Server, ServerUser } from '@/types/api'

/** En hexadecimal, porque xterm no entiende oklch(). Copia de los tokens
 *  `--term-*` de index.css, que cambian juntos. */
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

/** Ctrl+C corta el proceso y Ctrl+F mueve el cursor. Con Shift son de la
 *  ventana, como en cualquier terminal. */
const ATAJOS_DE_LA_VENTANA = 'fcv'

const fetchAtajo = (evento: KeyboardEvent) =>
  evento.ctrlKey && evento.shiftKey ? evento.key.toLowerCase() : ''

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
  /** Las de atrás siguen conectadas y recibiendo, solo que no se ven. */
  visible: boolean
  onEstado: (id: string, estado: EstadoTerminal) => void
  onLatencia: (id: string, medidas: Latencias) => void
  /** Cierra la que acabó, y si es la única, sale de la terminal. */
  onCerrar: () => void
  esLaUnica: boolean
  /** Sus archivos, a mano de la barra, que manda a la terminal que se ve. */
  onMando: (id: string, mando: MandoDeArchivos) => void
  /** Para que la barra diga si el panel de archivos está abierto. */
  onArchivosAbiertos: (id: string, abiertos: boolean) => void
}

export interface MandoDeArchivos {
  verArchivos: () => void
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
  onCerrar,
  esLaUnica,
  onMando,
  onArchivosAbiertos,
}: PanelProps) {
  const contenedor = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<Terminal | null>(null)
  const buscador = useRef<SearchAddon | null>(null)
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: 'conectando' })
  const [buscando, setBuscando] = useState(false)
  // Adónde iría lo que se arrastra; null si no se arrastra nada encima
  const [destinoDeArrastre, setDestinoDeArrastre] = useState<string | null>(null)
  // La carpeta en la que se abrió; null con el panel cerrado
  const [explorando, setExplorando] = useState<string | null>(null)
  const zonaDeArchivos = useRef<HTMLDivElement | null>(null)
  const raiz = useRef<HTMLDivElement | null>(null)
  const idDelPanel = useId()
  const hayLugarAlLado = useHayLugarAlLado()
  const [ancho, setAncho] = useState(leerAncho)
  // Lo que mide la pestaña; con ella oculta se conserva la última medida
  const [disponible, setDisponible] = useState(0)
  // La que anuncia el shell (OSC 7); el prompt es el plan B
  const anunciada = useRef('')
  const [coincidencias, setCoincidencias] = useState<Coincidencias>(SIN_COINCIDENCIAS)

  const avisarLatencia = useCallback(
    (medidas: Latencias) => onLatencia(id, medidas),
    [id, onLatencia],
  )

  const {
    cambiarArchivo,
    cancelarTodas,
    cancelarTransferencia,
    conflicto,
    decidirConflicto,
    encolarSubidas,
    limpiarTransferencias,
    reintentarTransferencia,
    transferencias,
    descargar,
    ejecutarTarea,
    guardarContenido,
    pedirContenido,
    enviarTamano,
    pedirArchivos,
    reconectar,
    teclear,
  } = useTerminalSocket({
    server,
    credencial,
    terminal,
    onEstado: setEstado,
    onLatencia: avisarLatencia,
  })

  useEffect(() => {
    onEstado(id, estado)
  }, [id, estado, onEstado])

  /** Donde está la shell, según lo que anuncia o lo que muestra el prompt. */
  const fetchDestino = useCallback(() => {
    const vista = terminal.current
    const activa = vista?.buffer.active
    const prompt = activa?.getLine(activa.baseY + activa.cursorY)?.translateToString(true)
    return (
      anunciada.current ||
      (prompt ? leerDelPrompt(prompt) : null) ||
      credencial.working_directory ||
      '~'
    )
  }, [credencial.working_directory, terminal])

  useEffect(() => {
    onMando(id, {
      verArchivos: () => setExplorando((abierto) => (abierto ? null : fetchDestino())),
    })
  }, [id, onMando, fetchDestino])

  /** Sobre el panel de archivos manda su propio aviso, con su carpeta. */
  const estaSobreElPanel = (objetivo: EventTarget) =>
    Boolean(zonaDeArchivos.current?.contains(objetivo as Node))

  useEffect(() => {
    onArchivosAbiertos(id, explorando !== null)
  }, [id, explorando, onArchivosAbiertos])

  const cerrarArchivos = () => {
    setExplorando(null)
    terminal.current?.focus()
  }

  useEffect(() => {
    const nodo = raiz.current
    if (!nodo) return
    const observador = new ResizeObserver(() => {
      if (nodo.clientWidth) setDisponible(nodo.clientWidth)
    })
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  const acoplado = explorando !== null && hayLugarAlLado
  const anchoDelPanel = disponible ? limitarAncho(ancho, disponible) : ancho

  /** Lleva la shell a la carpeta de lo subido y lo muestra. */
  const irALaCarpeta = (ruta: string) => {
    teclear(`cd ${quotePath(fetchCarpetaDeLaRuta(ruta))} && ls -l ${quotePath(ruta)}\r`)
    terminal.current?.focus()
  }

  const abrirEnTerminal = (ruta: string) => {
    teclear(`cd ${quotePath(ruta)}\r`)
    terminal.current?.focus()
  }

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

      const atajo = fetchAtajo(evento)
      if (!atajo || !ATAJOS_DE_LA_VENTANA.includes(atajo)) return true
      if (evento.type === 'keydown') {
        if (atajo === 'f') setBuscando(true)
        if (atajo === 'c') void copiarLoSeleccionado(vista)
        if (atajo === 'v') void pegarDelPortapapeles(teclear)
      }
      return false
    })
    vista.parser.registerOscHandler(7, (carga) => {
      anunciada.current = leerOsc7(carga) ?? anunciada.current
      return false
    })
    terminal.current = vista
    buscador.current = busqueda

    const cuenta = busqueda.onDidChangeResults(({ resultIndex, resultCount }) =>
      setCoincidencias({ actual: resultIndex + 1, total: resultCount }),
    )

    // Oculta mide cero y xterm quedaría en una fila, así que el ajuste espera
    // al cuadro siguiente, cuando el contenedor ya tiene tamaño
    let marco = requestAnimationFrame(() => ajuste.fit())

    const teclado = vista.onData(teclear)

    // Arrastrar el divisor redimensiona en cada cuadro, y la shell solo se
    // entera cuando cambian las columnas o las filas
    let medida = ''
    const observador = new ResizeObserver(() => {
      if (!nodo.clientWidth) return
      cancelAnimationFrame(marco)
      marco = requestAnimationFrame(() => {
        ajuste.fit()
        const nueva = `${vista.cols}x${vista.rows}`
        if (nueva === medida) return
        medida = nueva
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
    if (visible && !buscando && !explorando) terminal.current?.focus()
  }, [visible, buscando, explorando])

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
      ref={raiz}
      className={cn('relative flex min-h-0 flex-1 overflow-hidden', !visible && 'hidden')}
      role="tabpanel"
      aria-label={`Terminal de ${credencial.username}`}
      onDragOverCapture={(evento) => {
        if (estaSobreElPanel(evento.target)) {
          setDestinoDeArrastre(null)
          return
        }
        evento.preventDefault()
        if (destinoDeArrastre === null) setDestinoDeArrastre(fetchDestino())
      }}
      onDragLeave={(evento) => {
        // Pasar sobre xterm también dispara leave, y solo cuenta salir del panel
        if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
          setDestinoDeArrastre(null)
        }
      }}
      // En captura, porque el panel de archivos corta el drop que es suyo
      onDropCapture={() => setDestinoDeArrastre(null)}
      onDrop={(evento) => {
        evento.preventDefault()
        const destino = fetchDestino()
        void leerSoltados(evento.dataTransfer).then((soltados) =>
          encolarSubidas(planearSubida(destino, soltados)),
        )
      }}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col p-2">
        <div ref={contenedor} className="min-h-0 flex-1 overflow-hidden" />

        {estado.fase === 'cerrada' && (
          <div className="border-term-border bg-term-bg relative z-10 mt-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
            <span className="bg-term-root size-2 shrink-0 rounded-full" aria-hidden />
            <span className="min-w-0 flex-1 text-sm">{estado.motivo}</span>
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              {estado.reintentable && (
                <BotonDeCierre className="flex-1 sm:flex-none" onClick={reconectar}>
                  <RotateCwIcon />
                  <span className="sm:hidden">Reconectar</span>
                  <span className="hidden sm:inline">Volver a conectar</span>
                </BotonDeCierre>
              )}
              {estado.codigo === CIERRE.SIN_SALDO && (
                <BotonDeCierre className="flex-1 sm:flex-none" asChild>
                  <Link to="/app/credits">
                    <CoinsIcon />
                    Ver créditos
                  </Link>
                </BotonDeCierre>
              )}
              <BotonDeCierre className="flex-1 sm:flex-none" onClick={onCerrar}>
                <XIcon />
                <span className="sm:hidden">{esLaUnica ? 'Salir' : 'Cerrar'}</span>
                <span className="hidden sm:inline">
                  {esLaUnica ? 'Salir de la terminal' : 'Cerrar pestaña'}
                </span>
              </BotonDeCierre>
            </div>
          </div>
        )}

        {buscando && (
          <BuscadorEnTerminal
            coincidencias={coincidencias}
            onBuscar={buscar}
            onCerrar={cerrarBusqueda}
          />
        )}

        {destinoDeArrastre !== null && (
          <div
            className={cn(
              'bg-term-bg/85 pointer-events-none absolute inset-2 grid place-items-center rounded-md border border-dashed border-white/25',
              // Con el panel encima, solo la parte de la terminal que se ve
              explorando !== null && !acoplado && 'sm:right-[27rem]',
            )}
          >
            <p className="px-4 text-center text-sm">
              Suelte para subir a{' '}
              <span className="font-machine break-all">{destinoDeArrastre}</span>, la
              carpeta donde está la terminal
            </p>
          </div>
        )}

        {transferencias.length > 0 && (
          <div
            className={cn(
              'absolute inset-x-3 bottom-3 z-30 sm:left-auto',
              // A la izquierda del panel encima, para no tapar su lista
              explorando !== null && !acoplado && 'sm:right-[27.5rem]',
            )}
          >
            <PanelDeTransferencias
              transferencias={transferencias}
              onCancelar={cancelarTransferencia}
              onCancelarTodo={cancelarTodas}
              onReintentar={reintentarTransferencia}
              onIrALaCarpeta={irALaCarpeta}
              onCerrar={limpiarTransferencias}
            />
          </div>
        )}
      </div>

      <div ref={zonaDeArchivos} className="contents">
        {explorando !== null && (
          <>
            {acoplado && (
              <DivisorDePanel
                ancho={anchoDelPanel}
                minimo={ANCHO_MINIMO}
                maximo={fetchAnchoMaximo(disponible)}
                controla={idDelPanel}
                onCambiar={setAncho}
                onTerminar={() => guardarAncho(anchoDelPanel)}
                onReiniciar={() => {
                  setAncho(ANCHO_INICIAL)
                  guardarAncho(ANCHO_INICIAL)
                }}
              />
            )}
            <PanelLateral
              id={idDelPanel}
              onCerrar={cerrarArchivos}
              style={acoplado ? { width: anchoDelPanel } : undefined}
              className={
                acoplado
                  ? 'shrink-0'
                  : 'border-term-border absolute inset-2 z-20 rounded-md border shadow-lg sm:left-auto sm:w-[26rem]'
              }
              pestanas={[
                {
                  id: 'archivos',
                  etiqueta: 'Archivos',
                  icono: FolderIcon,
                  contenido: (
                    <PanelDeArchivos
                      carpetaInicial={explorando}
                      pedirArchivos={pedirArchivos}
                      cambiarArchivo={cambiarArchivo}
                      pedirContenido={pedirContenido}
                      guardarContenido={guardarContenido}
                      descargar={descargar}
                      ejecutarTarea={ejecutarTarea}
                      subir={encolarSubidas}
                      abrirEnTerminal={abrirEnTerminal}
                      onCerrar={cerrarArchivos}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </div>

      <DialogoDeConflicto conflicto={conflicto} onDecidir={decidirConflicto} />
    </div>
  )
}

async function copiarLoSeleccionado(vista: Terminal) {
  const elegido = vista.getSelection()
  if (!elegido) return
  try {
    await navigator.clipboard.writeText(elegido)
  } catch {
    // Sin permiso queda la selección, que se copia con el menú del navegador
  }
}

async function pegarDelPortapapeles(teclear: (datos: string) => void) {
  try {
    const texto = await navigator.clipboard.readText()
    if (texto) teclear(texto)
  } catch {
    // Sin permiso no se pega; Ctrl+V del navegador sigue funcionando
  }
}

function BotonDeCierre({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'border-term-border text-term-text bg-transparent hover:bg-white/5',
        className,
      )}
      {...props}
    />
  )
}
