import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import { cn } from 'cn'
import { ArrowLeftIcon, CoinsIcon, Loader2Icon, RotateCwIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import '@xterm/xterm/css/xterm.css'
import '@/features/terminal/terminal.css'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as serversApi from '@/features/servers/api'
import { CIERRE, type EstadoTerminal } from '@/features/terminal/socket'
import { useTerminalSocket } from '@/features/terminal/use-terminal-socket'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { buildServerPath } from '@/features/servers/paths'
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

/** Monta xterm una vez y le ata la shell; al reconectar, lo escrito sigue
 *  en pantalla. */
function SesionDeTerminal({ server, credencial }: SesionProps) {
  const volver = useVolver(buildServerPath(server.id))
  const cliente = useQueryClient()
  const { icono: IconoDeEntrada, etiqueta: comoEntra } =
    FORMAS_DE_ENTRAR[credencial.auth_type]
  const contenedor = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<Terminal | null>(null)
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: 'conectando' })
  const rutaInicial = credencial.working_directory

  const { enviar, enviarTamano, reconectar } = useTerminalSocket({
    server,
    credencial,
    terminal,
    onEstado: setEstado,
  })

  // La sesion cambia el ultimo uso de credencial y servidor: al salir se
  // invalidan sus listas, «Usadas hace poco» incluida
  useEffect(
    () => () => {
      void cliente.invalidateQueries({ queryKey: ['servers'] })
      void cliente.invalidateQueries({ queryKey: ['credentials'] })
    },
    [cliente],
  )

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
    terminal.current = vista

    // Ajuste en el siguiente frame: tras open el contenedor aun mide cero
    // y xterm quedaria en 80x24
    let marco = requestAnimationFrame(() => ajuste.fit())

    const teclado = vista.onData((datos) => enviar({ command: datos }))

    const observador = new ResizeObserver(() => {
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
  }, [enviar, enviarTamano])

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
