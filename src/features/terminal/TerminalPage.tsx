import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import { cn } from 'cn'
import { ArrowLeftIcon, CoinsIcon, Loader2Icon, RotateCwIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import '@xterm/xterm/css/xterm.css'
import '@/features/terminal/terminal.css'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAccessToken } from '@/features/auth/token-store'
import * as serversApi from '@/features/servers/api'
import {
  buildInitialCommand,
  buildTerminalUrl,
  CIERRE,
  describeClose,
  parseIncoming,
  type EstadoTerminal,
} from '@/features/terminal/socket'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { buildServerPath } from '@/features/servers/paths'
import { env } from '@/lib/env'
import { useVolver } from '@/lib/use-volver'
import { isUuid } from '@/lib/ids'
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

/** No monta la sesion sin servidor y credencial: el socket nace con el
 *  token ya refrescado. */
export function TerminalPage() {
  const { serverId: serverParam } = useParams()
  const [parametros] = useSearchParams()

  const serverId = serverParam ?? ''
  const credentialId = parametros.get('credential') ?? ''
  const direccionValida = isUuid(serverId) && isUuid(credentialId)

  // Pasa por el interceptor: refresca el access caducado antes de que el
  // WebSocket lo lleve en la query (un 4401 no tiene remedio)
  const servidor = useQuery({
    queryKey: serversApi.clavesServidor.detalle(serverId),
    queryFn: () => serversApi.fetchServer(serverId),
    enabled: direccionValida,
  })

  const credencial = servidor.data?.users.find((una) => una.id === credentialId) ?? null

  if (!direccionValida) {
    return <PantallaDeAviso texto="Esta dirección no lleva a ninguna terminal." />
  }

  if (servidor.isError) {
    return (
      <PantallaDeAviso texto="No se encontró ese servidor, o el acceso ya no está disponible." />
    )
  }

  if (servidor.isSuccess && !credencial) {
    return (
      <PantallaDeAviso texto="Esa credencial ya no existe. Seleccione otra desde la ficha." />
    )
  }

  if (!servidor.data || !credencial) {
    return (
      <div className="bg-term-bg text-term-dim grid h-pantalla place-items-center text-sm">
        <span className="flex items-center gap-2">
          <Loader2Icon className="size-4 animate-spin" />
          Preparando la terminal
        </span>
      </div>
    )
  }

  return <SesionDeTerminal server={servidor.data} credencial={credencial} />
}

interface SesionProps {
  server: Server
  credencial: ServerUser
}

/** Monta xterm y el WebSocket; los desmonta enteros al salir. */
function SesionDeTerminal({ server, credencial }: SesionProps) {
  const volver = useVolver(buildServerPath(server.id))
  const cliente = useQueryClient()
  const { icono: IconoDeEntrada, etiqueta: comoEntra } =
    FORMAS_DE_ENTRAR[credencial.auth_type]
  const contenedor = useRef<HTMLDivElement | null>(null)
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: 'conectando' })
  const [intento, setIntento] = useState(0)

  const reconectar = useCallback(() => {
    setEstado({ fase: 'conectando' })
    setIntento((actual) => actual + 1)
  }, [])

  // La sesion cambia el ultimo uso de credencial y servidor: al salir se
  // invalidan sus listas, «Usadas hace poco» incluida
  useEffect(
    () => () => {
      void cliente.invalidateQueries({ queryKey: ['servers'] })
      void cliente.invalidateQueries({ queryKey: ['credentials'] })
    },
    [cliente],
  )

  const rutaInicial = credencial.working_directory

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return

    const terminal = new Terminal({
      theme: TEMA,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: true,
    })
    const ajuste = new FitAddon()
    terminal.loadAddon(ajuste)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(nodo)

    // Ajuste en el siguiente frame: tras open el contenedor aun mide cero
    // y xterm quedaria en 80x24
    let marco = requestAnimationFrame(() => ajuste.fit())

    let socket: WebSocket | null = null
    let inicialPendiente = buildInitialCommand(rutaInicial)

    const enviar = (carga: object) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(carga))
    }
    const enviarTamano = () =>
      enviar({ resize: { cols: terminal.cols, rows: terminal.rows } })

    // Diferido un tick: StrictMode monta, limpia y remonta en el mismo tick;
    // un socket sincrono arrancaria y abortaria un intento SSH en el backend
    const apertura = window.setTimeout(() => {
      socket = new WebSocket(
        buildTerminalUrl(env.socketUrl, server.id, credencial.id, getAccessToken() ?? ''),
      )

      socket.onopen = () => {
        setEstado({ fase: 'conectada' })
        terminal.focus()
        enviarTamano()
      }

      socket.onmessage = (evento) => {
        const mensaje = parseIncoming(String(evento.data))
        if (!mensaje) return
        terminal.write(mensaje.message)

        // El cd espera a la primera salida (el prompt): en onopen la shell
        // remota aun no existe
        if (inicialPendiente && mensaje.type === 'output') {
          enviar({ command: inicialPendiente })
          inicialPendiente = null
        }
      }

      socket.onclose = (evento) => {
        const { motivo, reintentable } = describeClose(evento.code)
        setEstado({ fase: 'cerrada', codigo: evento.code, motivo, reintentable })
        terminal.write(`

[2m— ${motivo} —[0m

`)
      }
    }, 0)

    const teclado = terminal.onData((datos) => enviar({ command: datos }))

    const observador = new ResizeObserver(() => {
      cancelAnimationFrame(marco)
      marco = requestAnimationFrame(() => {
        ajuste.fit()
        enviarTamano()
      })
    })
    observador.observe(nodo)

    return () => {
      window.clearTimeout(apertura)
      cancelAnimationFrame(marco)
      observador.disconnect()
      teclado.dispose()
      if (socket) {
        // Manejadores fuera antes de cerrar: este cierre no marca como caida
        // la sesion del siguiente montaje
        socket.onopen = null
        socket.onmessage = null
        socket.onclose = null
        // Cerrar el socket libera la sesion SSH remota
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(1000)
        }
      }
      terminal.dispose()
    }
  }, [server.id, credencial.id, rutaInicial, intento])

  return (
    // Sin scroll de pagina: desplaza xterm por dentro. El recorte absorbe los
    // pixeles de mas que xterm mide en sus filas (evita una segunda barra)
    <div className="bg-term-bg text-term-text flex h-pantalla flex-col overflow-hidden">
      <header className="border-term-border flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-term-dim hover:text-term-text hover:bg-white/5"
          aria-label="Volver"
          onClick={volver}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-medium">{server.name}</span>
          <Badge className="bg-white/8 text-term-text gap-1 border-transparent font-normal">
            <IconoDeEntrada className="size-3" />
            <span className="font-machine">{credencial.username}</span>
            <span className="sr-only">{comoEntra}</span>
          </Badge>
          {rutaInicial && (
            <span className="text-term-dim font-machine hidden truncate sm:inline">
              · {rutaInicial}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-2 text-xs"
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                'size-2 rounded-full',
                estado.fase === 'conectada' && 'bg-term-ok',
                estado.fase === 'conectando' && 'bg-term-arg animate-pulse',
                estado.fase === 'cerrada' && 'bg-term-root',
              )}
              aria-hidden
            />
            <span className="text-term-dim hidden sm:inline">
              {estado.fase === 'conectada' && 'Conectado'}
              {estado.fase === 'conectando' && 'Conectando'}
              {estado.fase === 'cerrada' && estado.motivo}
            </span>
          </span>

          {estado.fase === 'cerrada' && estado.reintentable && (
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

          {estado.fase === 'cerrada' && estado.codigo === CIERRE.SIN_SALDO && (
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

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={volver}
            aria-label="Cerrar la terminal"
            className="text-term-dim hover:text-term-text hover:bg-white/5"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      <main
        ref={contenedor}
        className="min-h-0 flex-1 overflow-hidden p-2"
        aria-label="Terminal"
      />
    </div>
  )
}

function PantallaDeAviso({ texto }: { texto: string }) {
  return (
    <div className="bg-background grid min-h-pantalla place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm">{texto}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/app/servers">
            <ArrowLeftIcon />
            Volver a servidores
          </Link>
        </Button>
      </div>
    </div>
  )
}
