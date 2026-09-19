import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  FolderIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  TagIcon,
  TerminalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Bloque } from '@/components/bloque'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState, LineaEsqueleto } from '@/components/states'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { accionDeAcceso, puedeConectar, puedeGestionar } from '@/features/access/levels'
import { buildCredentialPath } from '@/features/credentials/paths'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { LabelChips } from '@/features/servers/LabelChips'
import { LinkChips } from '@/features/servers/LinkChips'
import { buildTerminalPath } from '@/features/terminal/socket'
import { describirEstado } from '@/features/servers/sessions'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { Server, ServerUser, TerminalSession } from '@/types/api'

/** Piezas compartidas por la ficha lateral y la pagina del servidor. */

/** En linea tras el nombre: si este salta, sigue a la ultima palabra. */
export function VerificadoBadge({ server }: { server: Server }) {
  return (
    <Badge
      variant={server.has_host_key ? 'secondary' : 'outline'}
      className="ml-2 align-middle font-normal"
    >
      {server.has_host_key ? 'Verificado' : 'Sin verificar'}
    </Badge>
  )
}

/** Copiar evita erratas en el dato que decide a que maquina se conecta. */
export function CopiarDireccion({ valor }: { valor: string }) {
  const [copiada, setCopiada] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiada(true)
      window.setTimeout(() => setCopiada(false), 1600)
    } catch {
      // Sin permiso de portapapeles queda la seleccion manual
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="text-muted-foreground hover:text-foreground focus-visible:outline-ring group flex w-fit items-center gap-2 rounded text-sm focus-visible:-outline-offset-2 focus-visible:outline-1"
      aria-label={copiada ? 'Dirección copiada' : `Copiar ${valor}`}
    >
      <span className="font-machine">{valor}</span>
      {copiada ? (
        <CheckIcon className="text-success size-3.5" />
      ) : (
        <CopyIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      )}
    </button>
  )
}

export function Metricas({ server }: { server: Server }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
      <Metrica etiqueta="Sesiones" valor={String(server.total_sessions)} />
      <Metrica
        etiqueta="Último uso"
        valor={formatRelative(server.last_used_at)}
        exacto={formatDateTime(server.last_used_at)}
      />
      <Metrica etiqueta="Media" valor={server.average_session_time} />
    </div>
  )
}

/** Rótulos fijos: solo falta el número. */
export function MetricasEsqueleto() {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
      <Metrica etiqueta="Sesiones" />
      <Metrica etiqueta="Último uso" />
      <Metrica etiqueta="Media" />
    </div>
  )
}

export function Metrica({
  etiqueta,
  valor,
  exacto,
}: {
  etiqueta: string
  /** Sin valor: cargando. */
  valor?: string
  exacto?: string
}) {
  return (
    <div className="bg-card p-3 text-center">
      {valor === undefined ? (
        <LineaEsqueleto texto="base" className="mx-auto w-12" />
      ) : (
        <p className="truncate text-base font-semibold tabular-nums" title={exacto}>
          {valor}
        </p>
      )}
      <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide uppercase">
        {etiqueta}
      </p>
    </div>
  )
}

export function Origen({ server }: { server: Server }) {
  return (
    <Bloque titulo="Origen">
      <dl className="divide-y">
        <Dato etiqueta="Organización" valor={server.organization_name} />
        <Dato etiqueta="Lo registró" valor={server.created_by_name ?? 'Sin registrar'} />
        <Dato etiqueta="Alta" valor={formatDateTime(server.created_at)} />
      </dl>
    </Bloque>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-muted-foreground shrink-0">{etiqueta}</dt>
      <dd className="truncate text-right">{valor}</dd>
    </div>
  )
}

export interface ConsultaSesiones {
  isPending: boolean
  isError: boolean
  data?: { results: TerminalSession[] }
}

export function SesionesLista({
  consulta,
  conCredencial = true,
}: {
  consulta: ConsultaSesiones
  /** En la pagina de una credencial todas las filas son esa. */
  conCredencial?: boolean
}) {
  if (consulta.isPending) {
    return (
      <ul className="divide-y" aria-busy>
        {Array.from({ length: 3 }, (_, indice) => (
          <li key={indice} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <LineaEsqueleto className="w-28" />
              <LineaEsqueleto texto="xs" className="w-20" />
            </div>
            <LineaEsqueleto texto="xs" className="w-20" />
          </li>
        ))}
      </ul>
    )
  }

  if (consulta.isError) {
    return (
      <p className="text-muted-foreground p-4 text-sm">No pudimos cargar las sesiones.</p>
    )
  }

  const sesiones = consulta.data?.results ?? []

  if (sesiones.length === 0) {
    return (
      <EmptyState
        compacto
        icon={TerminalIcon}
        title="Sin sesiones todavía"
        description="Cada terminal que se abra quedará aquí, con quién y cuándo."
      />
    )
  }

  return (
    <ul className="divide-y">
      {sesiones.map((sesion) => (
        <li
          key={sesion.id}
          className="flex items-baseline justify-between gap-3 px-4 py-3"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm">
              {sesion.opened_by_name ?? 'Alguien'}
            </span>
            <span className="text-muted-foreground block text-xs">
              {formatRelative(sesion.started_at)}
              {conCredencial && sesion.username && (
                <>
                  {' · '}
                  <span className="font-machine">{sesion.username}</span>
                </>
              )}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5 text-xs">
            <EstadoDeSesion status={sesion.status} />
            <span className="text-muted-foreground tabular-nums">{sesion.duration}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Distingue una sesion viva de una caida. */
export function EstadoDeSesion({ status }: { status: string }) {
  const { etiqueta, punto, texto } = describirEstado(status)

  return (
    <span className={cn('inline-flex items-center gap-1.5', texto)}>
      <span className={cn('size-1.5 rounded-full', punto)} aria-hidden />
      {etiqueta}
    </span>
  )
}

export interface AccionesDeCredencial {
  onAnadirCredencial: () => void
  onCompartirCredencial: (credencial: ServerUser) => void
  onEditarCredencial: (credencial: ServerUser) => void
  onEliminarCredencial: (credencial: ServerUser) => void
  onEnlacesCredencial: (credencial: ServerUser) => void
  onEtiquetasCredencial: (credencial: ServerUser) => void
}

interface FilaProps {
  server: Server
  credencial: ServerUser
  /** Solo el usuario; carpeta y enlaces van en la lista. */
  compacta?: boolean
  acciones: AccionesDeCredencial
}

/** El icono de la fila indica como se entra: una insignia de texto
 *  restaria sitio al usuario. */
function FormaDeEntrar({ credencial }: { credencial: ServerUser }) {
  const { icono: Icono, etiqueta } = FORMAS_DE_ENTRAR[credencial.auth_type]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground shrink-0">
          <Icono className="size-4" />
          <span className="sr-only">{etiqueta}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{etiqueta}</TooltipContent>
    </Tooltip>
  )
}

/** Terminal: accion diaria, boton a la vista y no en el menu. */
export function FilaCredencial({
  server,
  credencial,
  compacta = false,
  acciones,
}: FilaProps) {
  const navegar = useNavigate()
  const { organization } = useCurrentOrganization()
  const { etiqueta: accesos, icono: IconoDeAccesos } = accionDeAcceso(
    canManage(organization),
  )
  // Enlaces plegados de partida: primero se busca la credencial
  const [enlacesAbiertos, setEnlacesAbiertos] = useState(false)
  const enlaces = credencial.links.length

  return (
    <li className="px-5 py-3">
      <div className="flex h-8 items-center gap-3">
        <FormaDeEntrar credencial={credencial} />
        <span
          className="font-machine min-w-0 flex-1 truncate text-sm"
          title={credencial.username}
        >
          {credencial.username}
        </span>

        {!compacta && enlaces > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={enlacesAbiertos}
            aria-label={`${enlacesAbiertos ? 'Ocultar' : 'Ver'} los ${enlaces} enlaces de ${credencial.username}`}
            onClick={() => setEnlacesAbiertos((actual) => !actual)}
          >
            <ChevronDownIcon
              className={cn(
                'size-4 transition-transform',
                enlacesAbiertos && 'rotate-180',
              )}
            />
          </Button>
        )}

        {/* Relleno del acento: es la accion principal de la fila */}
        {puedeConectar(credencial) && (
          <Button
            size="icon-sm"
            aria-label={`Abrir terminal con ${credencial.username}`}
            onClick={() => navegar(buildTerminalPath(server.id, credencial.id))}
          >
            <TerminalIcon className="size-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-2"
              aria-label={`Acciones de ${credencial.username}`}
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => navegar(buildCredentialPath(credencial.id))}
            >
              <FileTextIcon className="size-4" />
              Ver detalle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => acciones.onCompartirCredencial(credencial)}>
              <IconoDeAccesos className="size-4" />
              {accesos}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => acciones.onEnlacesCredencial(credencial)}>
              <LinkIcon className="size-4" />
              Enlaces
            </DropdownMenuItem>
            {/* Solo quien gestiona la maquina; al resto daria 403 */}
            {puedeGestionar(credencial) && (
              <>
                <DropdownMenuItem
                  onSelect={() => acciones.onEtiquetasCredencial(credencial)}
                >
                  <TagIcon className="size-4" />
                  Etiquetas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => acciones.onEditarCredencial(credencial)}
                >
                  <PencilIcon className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => acciones.onEliminarCredencial(credencial)}
                >
                  <Trash2Icon className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Debajo y a lo ancho de la fila, no en la columna del usuario */}
      {!compacta && (
        <div className="mt-2 space-y-1.5 pl-7">
          {/* El entorno suele ir en la credencial: distingue la de pruebas */}
          <LabelChips labels={credencial.labels} maximo={2} unaLinea />
          {credencial.working_directory && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <FolderIcon className="size-3 shrink-0" />
              <span className="font-machine truncate">
                {credencial.working_directory}
              </span>
            </p>
          )}
          {enlacesAbiertos && (
            <LinkChips links={credencial.links} presentacion="columna" />
          )}
        </div>
      )}
    </li>
  )
}

/** Solo cuentan las conectables: con una abre directo; con varias, menu.
 *  Sin ninguna no sale; sin credenciales, sale inactivo para quien
 *  gestiona. */
export function AbrirTerminal({
  server,
  className,
}: {
  server: Server
  className?: string
}) {
  const navegar = useNavigate()
  const conectables = server.users.filter(puedeConectar)

  if (conectables.length === 0 && (server.users.length > 0 || !puedeGestionar(server))) {
    return null
  }

  if (conectables.length <= 1) {
    const unica = conectables[0]
    return (
      <Button
        className={className}
        disabled={!unica}
        onClick={() => unica && navegar(buildTerminalPath(server.id, unica.id))}
      >
        <TerminalIcon />
        Abrir terminal
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className}>
          <TerminalIcon />
          Abrir terminal
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {conectables.map((credencial) => {
          const { icono: Icono, etiqueta } = FORMAS_DE_ENTRAR[credencial.auth_type]

          return (
            <DropdownMenuItem
              key={credencial.id}
              onSelect={() => navegar(buildTerminalPath(server.id, credencial.id))}
            >
              <Icono className="size-4" />
              <span className="font-machine">{credencial.username}</span>
              <span className="sr-only">{etiqueta}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
