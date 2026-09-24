import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowLeftIcon, Loader2Icon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import '@xterm/xterm/css/xterm.css'
import '@/features/terminal/terminal.css'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as serversApi from '@/features/servers/api'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { buildServerPath } from '@/features/servers/paths'
import { BarraDePestanas } from '@/features/terminal/BarraDePestanas'
import { type MandoDeSubida, PanelDeTerminal } from '@/features/terminal/PanelDeTerminal'
import {
  buildPestana,
  fetchActivaTrasCerrar,
  MAXIMO_DE_PESTANAS,
  type Pestana,
} from '@/features/terminal/pestanas'
import type { EstadoTerminal } from '@/features/terminal/socket'
import { isUuid } from '@/lib/ids'
import { useVolver } from '@/lib/use-volver'
import type { Server, ServerUser } from '@/types/api'

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

  return <EspacioDeTerminales server={servidor.data} credencial={credencial} />
}

interface EspacioProps {
  server: Server
  credencial: ServerUser
}

/** Ventana con varias shells del mismo servidor: las de atrás siguen
 *  corriendo mientras se mira otra. */
function EspacioDeTerminales({ server, credencial }: EspacioProps) {
  const volver = useVolver(buildServerPath(server.id))
  const cliente = useQueryClient()
  const [, setParametros] = useSearchParams()

  const [inicial] = useState(() => buildPestana(credencial.id))
  const [pestanas, setPestanas] = useState<Pestana[]>([inicial])
  const [activa, setActiva] = useState(inicial)
  const [estados, setEstados] = useState<Record<string, EstadoTerminal>>({})
  const [latencias, setLatencias] = useState<Record<string, number>>({})

  // La credencial puede haberse borrado con la shell abierta
  const credencialDelante =
    server.users.find((una) => una.id === activa.credentialId) ?? credencial
  const estado = estados[activa.id]
  const latencia = latencias[activa.id]
  const { icono: IconoDeEntrada, etiqueta: comoEntra } =
    FORMAS_DE_ENTRAR[credencialDelante.auth_type]

  const anotarEstado = useCallback((id: string, suyo: EstadoTerminal) => {
    setEstados((actuales) => ({ ...actuales, [id]: suyo }))
  }, [])

  const anotarLatencia = useCallback((id: string, ms: number) => {
    setLatencias((actuales) => ({ ...actuales, [id]: ms }))
  }, [])

  // Lo que pide la barra va a la shell que se ve, no a las de atrás
  const subidores = useRef<Record<string, MandoDeSubida>>({})
  const anotarSubidor = useCallback((id: string, mando: MandoDeSubida) => {
    subidores.current[id] = mando
  }, [])

  const abrir = (credentialId: string) => {
    if (pestanas.length >= MAXIMO_DE_PESTANAS) return
    const nueva = buildPestana(credentialId)
    setPestanas([...pestanas, nueva])
    setActiva(nueva)
  }

  const cerrar = (cerrada: Pestana) => {
    // Cerrar la única es cerrar la ventana
    if (pestanas.length === 1) {
      volver()
      return
    }
    setActiva(fetchActivaTrasCerrar(pestanas, cerrada, activa))
    setPestanas(pestanas.filter((una) => una.id !== cerrada.id))
    setEstados((actuales) => fetchSinLa(actuales, cerrada.id))
    setLatencias((actuales) => fetchSinLa(actuales, cerrada.id))
    subidores.current = fetchSinLa(subidores.current, cerrada.id)
  }

  // La direccion sigue a lo que se ve: recargar vuelve a esta credencial
  useEffect(() => {
    setParametros({ credential: credencialDelante.id }, { replace: true })
  }, [credencialDelante.id, setParametros])

  useEffect(() => {
    const cambiarDePestana = (evento: KeyboardEvent) => {
      if (!evento.altKey || evento.ctrlKey || evento.metaKey) return
      const destino = pestanas[Number(evento.key) - 1]
      if (!destino) return
      evento.preventDefault()
      setActiva(destino)
    }
    window.addEventListener('keydown', cambiarDePestana)
    return () => window.removeEventListener('keydown', cambiarDePestana)
  }, [pestanas])

  // La sesion cambia el ultimo uso de credencial y servidor: al salir se
  // invalidan sus listas, «Usadas hace poco» incluida
  useEffect(
    () => () => {
      void cliente.invalidateQueries({ queryKey: ['servers'] })
      void cliente.invalidateQueries({ queryKey: ['credentials'] })
    },
    [cliente],
  )

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
            <span className="font-machine">{credencialDelante.username}</span>
            <span className="sr-only">{comoEntra}</span>
          </Badge>
          {credencialDelante.working_directory && (
            <span className="text-term-dim font-machine hidden truncate sm:inline">
              · {credencialDelante.working_directory}
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
                estado?.fase === 'conectada' && 'bg-term-ok',
                estado?.fase === 'cerrada' && 'bg-term-root',
                (!estado || estado.fase === 'conectando') && 'bg-term-arg animate-pulse',
              )}
              aria-hidden
            />
            <span className="text-term-dim hidden sm:inline">
              {!estado || estado.fase === 'conectando' ? 'Conectando' : null}
              {estado?.fase === 'conectada' &&
                (latencia ? `Conectado · ${latencia} ms` : 'Conectado')}
              {estado?.fase === 'cerrada' && estado.motivo}
            </span>
          </span>

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

      <BarraDePestanas
        pestanas={pestanas}
        activa={activa.id}
        estados={estados}
        credenciales={server.users}
        onActivar={setActiva}
        onCerrar={cerrar}
        onAbrir={abrir}
        onSubir={(archivo) => subidores.current[activa.id]?.subir(archivo)}
        onElegirCarpeta={() => subidores.current[activa.id]?.elegirCarpeta()}
      />

      {pestanas.map((pestana) => {
        const suya = server.users.find((una) => una.id === pestana.credentialId)
        if (!suya) return null
        return (
          <PanelDeTerminal
            key={pestana.id}
            id={pestana.id}
            server={server}
            credencial={suya}
            visible={pestana.id === activa.id}
            onEstado={anotarEstado}
            onLatencia={anotarLatencia}
            onCerrar={() => cerrar(pestana)}
            esLaUnica={pestanas.length === 1}
            onSubidor={anotarSubidor}
          />
        )
      })}
    </div>
  )
}

/** Lo anotado, menos lo de una pestaña que ya se cerró. */
function fetchSinLa<Dato>(
  anotado: Record<string, Dato>,
  id: string,
): Record<string, Dato> {
  return Object.fromEntries(Object.entries(anotado).filter(([clave]) => clave !== id))
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
