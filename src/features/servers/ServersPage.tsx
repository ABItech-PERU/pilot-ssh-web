import { cn } from 'cn'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpDownIcon,
  EyeIcon,
  KeyRoundIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchXIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShieldQuestionIcon,
  TagIcon,
  TerminalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Columna } from '@/components/data-table'
import { FilterBar, FiltroSelect, SearchInput, ViewToggle } from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AccessSheet } from '@/features/access/AccessSheet'
import { accionDeAcceso, puedeConectar, puedeGestionar } from '@/features/access/levels'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { CredentialFormDialog } from '@/features/servers/CredentialFormDialog'
import { describeServerLoss } from '@/features/servers/deletion'
import { MoreBadge } from '@/components/more-badge'
import { LabelChips } from '@/features/servers/LabelChips'
import { LinkChips } from '@/features/servers/LinkChips'
import { ServerLinksSheet } from '@/features/servers/LinksSheet'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { buildServerPath } from '@/features/servers/paths'
import { ServerDetailSheet, type VistaFicha } from '@/features/servers/ServerDetailSheet'
import { ServerFormDialog } from '@/features/servers/ServerFormDialog'
import { useLabelOptions } from '@/features/servers/use-label-options'
import { toApiError } from '@/lib/api-error'
import { formatDateTime, formatRelative } from '@/lib/format'
import { useListado } from '@/lib/use-listado'
import type { Server } from '@/types/api'

const POR_PAGINA = 25

/** Por defecto, ultimo uso: se vuelve mas a la de ayer que a la nueva. */
const ORDENES = [
  { valor: '-last_session_at', etiqueta: 'Último uso' },
  { valor: '-created_at', etiqueta: 'Más recientes' },
  { valor: 'name', etiqueta: 'Nombre (A–Z)' },
  { valor: '-sessions_count', etiqueta: 'Más usados' },
] as const

const CREDENCIALES = [
  { valor: 'todas', etiqueta: 'Todas las credenciales' },
  { valor: 'with', etiqueta: 'Con credencial' },
  { valor: 'without', etiqueta: 'Sin credencial' },
] as const

interface Formulario {
  abierto: boolean
  server: Server | null
}

interface Ficha {
  server: Server
  vista: VistaFicha
}

export function ServersPage() {
  const { slug, organization } = useCurrentOrganization()
  const cliente = useQueryClient()
  const navegar = useNavigate()

  const [formulario, setFormulario] = useState<Formulario>({
    abierto: false,
    server: null,
  })
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [aBorrar, setABorrar] = useState<Server | null>(null)
  const [aCompartir, setACompartir] = useState<Server | null>(null)
  // Enlaces en panel lateral, sin salir de la lista
  const [enlacesDe, setEnlacesDe] = useState<Server | null>(null)
  const [credencialPara, setCredencialPara] = useState<Server | null>(null)
  const [primeraCredencial, setPrimeraCredencial] = useState(false)
  const [consultaDeLaUrl] = useSearchParams()

  const listado = useListado({
    modulo: 'servers',
    // Pocos y vistos enteros: la tarjeta cabe de un vistazo
    vistaPorDefecto: 'tarjetas',
    filtrosIniciales: {
      search: '',
      credentials: '',
      // Desde una etiqueta del catalogo: servidores que la llevan
      label: consultaDeLaUrl.get('label') ?? '',
      ordering: '-last_session_at',
    },
  })

  const parametros: serversApi.FiltrosServidor = {
    ...listado.parametros,
    ...(slug ? { organization: slug } : {}),
    page: listado.pagina,
  }

  const opcionesDeEtiqueta = useLabelOptions(
    serversApi.clavesServidor.etiquetas,
    serversApi.fetchLabels,
  )

  const consulta = useQuery({
    queryKey: serversApi.clavesServidor.todos(parametros),
    queryFn: () => serversApi.fetchServers(parametros),
    enabled: Boolean(slug),
    placeholderData: (anterior) => anterior,
  })

  const eliminar = useMutation({
    mutationFn: serversApi.deleteServer,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      toast.success('Servidor eliminado.')
      setABorrar(null)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const abrirAlta = () => setFormulario({ abierto: true, server: null })
  const abrirEdicion = (server: Server) => setFormulario({ abierto: true, server })
  const abrirFicha = (server: Server, vista: VistaFicha = 'resumen') =>
    setFicha({ server, vista })

  const pedirCredencial = (server: Server, primera = false) => {
    setPrimeraCredencial(primera)
    setCredencialPara(server)
  }

  const servidores = consulta.data?.results ?? []

  const columnas: Columna<Server>[] = [
    {
      key: 'name',
      header: 'Nombre',
      rol: 'titulo',
      ancho: '22%',
      cell: (server) => (
        <Link
          to={buildServerPath(server.id)}
          className="focus-visible:outline-ring rounded font-medium hover:underline focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          {server.name}
          <HostKeyBadge fijada={server.has_host_key} />
        </Link>
      ),
    },
    {
      key: 'ip',
      header: 'Dirección',
      ancho: '14%',
      cell: (server) => (
        <span className="font-machine text-muted-foreground text-[13px]">
          {server.ip}:{server.port}
        </span>
      ),
    },
    {
      // Visible: explica los accesos concedidos por etiqueta
      key: 'labels',
      header: 'Etiquetas',
      desde: 'xl',
      ancho: '14%',
      cell: (server) => <LabelChips labels={server.labels} maximo={2} vacio="Ninguna" />,
    },
    {
      key: 'users',
      header: 'Credenciales',
      ancho: '18%',
      cell: (server) => (
        <Credenciales
          server={server}
          onAnadir={() => pedirCredencial(server)}
          onVerTodas={() => abrirFicha(server, 'credenciales')}
        />
      ),
    },
    {
      key: 'links',
      header: 'Enlaces',
      desde: 'lg',
      ancho: '16%',
      cell: (server) => <LinkChips links={server.links} maximo={2} vacio="Ninguno" />,
    },
    {
      key: 'last_used',
      header: 'Último uso',
      desde: 'md',
      ancho: '10%',
      cell: (server) => (
        // Contexto, no decision: pesa menos que el nombre. Fecha exacta en
        // `title`
        <span
          className="text-muted-foreground text-xs"
          title={formatDateTime(server.last_used_at)}
        >
          {formatRelative(server.last_used_at)}
        </span>
      ),
    },
    {
      key: 'sessions',
      header: 'Sesiones',
      desde: 'xl',
      alineacion: 'derecha',
      ancho: '6%',
      cell: (server) => <span className="tabular-nums">{server.total_sessions}</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      alineacion: 'derecha',
      ancho: '96px',
      acciones: 2,
      cell: (server) => (
        <div className="flex justify-end gap-1">
          {server.users.some(puedeConectar) && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Abrir terminal de ${server.name}`}
              onClick={() => abrirFicha(server, 'credenciales')}
            >
              <TerminalIcon className="size-4" />
            </Button>
          )}
          <MenuDeFila
            server={server}
            onVer={() => abrirFicha(server)}
            onDetalle={() => navegar(buildServerPath(server.id))}
            onCredenciales={() => abrirFicha(server, 'credenciales')}
            onEnlaces={() => setEnlacesDe(server)}
            onCompartir={() => setACompartir(server)}
            puedeRepartir={canManage(organization)}
            onCredencial={() => pedirCredencial(server)}
            onEdit={() => abrirEdicion(server)}
            onDelete={() => setABorrar(server)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Servidores"
        description={
          organization
            ? `Servidores registrados en ${organization.name}.`
            : 'Servidores registrados.'
        }
        action={
          // Registrar exige administrar la organizacion; si no, daria 403
          canManage(organization) && (
            <Button onClick={abrirAlta} disabled={!slug}>
              <PlusIcon />
              Añadir servidor
            </Button>
          )
        }
      />

      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={consulta.isFetching}
        onLimpiar={listado.limpiarFiltros}
        onActualizar={() => consulta.refetch()}
        derecha={<ViewToggle vista={listado.vista} onChange={listado.setVista} />}
      >
        <SearchInput
          etiqueta="Buscar servidores"
          placeholder="Nombre o dirección"
          valor={listado.filtros.search}
          onChange={(valor) => listado.setFiltro('search', valor)}
        />
        <FiltroSelect
          icono={KeyRoundIcon}
          etiqueta="Filtrar por credenciales"
          valor={listado.filtros.credentials || 'todas'}
          onChange={(valor) =>
            listado.setFiltro('credentials', valor === 'todas' ? '' : valor)
          }
          opciones={CREDENCIALES}
        />
        {opcionesDeEtiqueta.length > 1 && (
          <FiltroSelect
            icono={TagIcon}
            etiqueta="Filtrar por etiqueta"
            valor={listado.filtros.label || 'todas'}
            onChange={(valor) =>
              listado.setFiltro('label', valor === 'todas' ? '' : valor)
            }
            opciones={opcionesDeEtiqueta}
          />
        )}
        <FiltroSelect
          icono={ArrowUpDownIcon}
          etiqueta="Ordenar la lista"
          valor={listado.filtros.ordering}
          onChange={(valor) => listado.setFiltro('ordering', valor)}
          opciones={ORDENES}
        />
      </FilterBar>

      <DataTable
        columnas={columnas}
        datos={servidores}
        getKey={(server) => server.id}
        vista={listado.vista}
        cargando={consulta.isPending}
        error={consulta.isError ? consulta.error : undefined}
        onReintentar={() => consulta.refetch()}
        filasEsperadas={servidores.length || 5}
        vacio={
          listado.hayFiltros ? (
            <SinResultados />
          ) : canManage(organization) ? (
            <PrimerServidor onAnadir={abrirAlta} />
          ) : (
            <SinAcceso />
          )
        }
      />

      <Pagination
        pagina={listado.pagina}
        total={consulta.data?.count ?? 0}
        porPagina={POR_PAGINA}
        etiqueta="servidores"
        onCambiar={listado.setPagina}
      />

      <ServerLinksSheet
        server={enlacesDe}
        open={enlacesDe !== null}
        onOpenChange={(abierto) => !abierto && setEnlacesDe(null)}
      />
      <AccessSheet
        server={aCompartir}
        open={aCompartir !== null}
        onOpenChange={(abierto) => !abierto && setACompartir(null)}
        puedeRepartir={organization?.role === 'owner' || organization?.role === 'admin'}
      />

      <ServerDetailSheet
        server={ficha?.server ?? null}
        vista={ficha?.vista}
        onOpenChange={(abierto) => !abierto && setFicha(null)}
      />

      <ServerFormDialog
        open={formulario.abierto}
        onOpenChange={(abierto) => setFormulario((actual) => ({ ...actual, abierto }))}
        server={formulario.server}
        // Tras el alta se pide la primera credencial
        onCreated={(server) => pedirCredencial(server, true)}
      />

      <CredentialFormDialog
        server={credencialPara}
        open={Boolean(credencialPara)}
        onOpenChange={(abierto) => !abierto && setCredencialPara(null)}
        primeraVez={primeraCredencial}
      />

      <ConfirmDialog
        open={Boolean(aBorrar)}
        onOpenChange={(abierto) => !abierto && setABorrar(null)}
        titulo={`¿Eliminar ${aBorrar?.name ?? ''}?`}
        descripcion="Solo se borra de Pilot SSH. Su servidor sigue funcionando igual."
        detalles={aBorrar ? describeServerLoss(aBorrar) : []}
        confirmacion={aBorrar?.name}
        accion="Eliminar servidor"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => aBorrar && eliminar.mutate(aBorrar.id)}
      />
    </div>
  )
}

const PASOS = [
  {
    icono: ServerIcon,
    titulo: 'Registrar servidor',
    detalle: 'Nombre, dirección y puerto.',
  },
  {
    icono: KeyRoundIcon,
    titulo: 'Añadir credencial',
    detalle: 'El usuario con el que se accede.',
  },
  {
    icono: TerminalIcon,
    titulo: 'Abrir terminal',
    detalle: 'Desde el navegador. Cada sesión queda registrada.',
  },
]

/** Primer uso: explica lo que viene y ofrece un solo boton. */
function PrimerServidor({ onAnadir }: { onAnadir: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center text-left">
      <h2 className="text-lg font-semibold">Registre su primer servidor</h2>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        Tres pasos y la terminal queda en el navegador.
      </p>

      <ol className="mt-8 w-full space-y-4">
        {PASOS.map(({ icono: Icono, titulo, detalle }, indice) => (
          <li key={titulo} className="flex gap-4">
            <span className="bg-accent text-accent-foreground relative grid size-10 shrink-0 place-items-center rounded-lg">
              <Icono className="size-5" />
              <span className="bg-primary text-primary-foreground absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full text-[11px] font-semibold">
                {indice + 1}
              </span>
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-medium">{titulo}</span>
              <span className="text-muted-foreground block text-sm">{detalle}</span>
            </span>
          </li>
        ))}
      </ol>

      <Button size="lg" className="mt-8" onClick={onAnadir}>
        <PlusIcon />
        Registrar mi primer servidor
      </Button>
    </div>
  )
}

function SinResultados() {
  return (
    <div className="flex flex-col items-center">
      <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
        <SearchXIcon className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">Ningún servidor coincide</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Pruebe otro texto o limpie los filtros.
      </p>
    </div>
  )
}

/** Sin credencial no hay terminal: la celda lo dice y ofrece anadirla. */
function Credenciales({
  server,
  onAnadir,
  onVerTodas,
}: {
  server: Server
  onAnadir: () => void
  onVerTodas: () => void
}) {
  if (server.users.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-warning/15 text-warning border-transparent font-normal">
          Sin credencial
        </Badge>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={onAnadir}>
          <PlusIcon className="size-3.5" />
          Añadir
        </Button>
      </div>
    )
  }

  return (
    // En media tarjeta un usuario largo se corta; `title` lo completa
    <div className="flex flex-wrap gap-1">
      {server.users.slice(0, 2).map((credencial) => {
        const { icono: Icono, etiqueta } = FORMAS_DE_ENTRAR[credencial.auth_type]

        return (
          <Badge
            key={credencial.id}
            variant="secondary"
            className="font-machine max-w-full gap-1"
            title={credencial.username}
          >
            <Icono className="size-3 shrink-0" />
            <span className="truncate">{credencial.username}</span>
            <span className="sr-only">{etiqueta}</span>
          </Badge>
        )
      })}
      {server.users.length > 2 && (
        <MoreBadge
          total={server.users.length - 2}
          aria-label={`Ver las ${server.users.length} credenciales de ${server.name}`}
          onClick={onVerTodas}
        />
      )}
    </div>
  )
}

interface MenuProps {
  server: Server
  onVer: () => void
  onDetalle: () => void
  onCredenciales: () => void
  onEnlaces: () => void
  onCompartir: () => void
  puedeRepartir: boolean
  onCredencial: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Ver: panel lateral; Ver detalle: la pagina. Credenciales y Enlaces
 *  tambien al lado, sin salir de la lista. Sin credencial, anadirla va
 *  primero. */
function MenuDeFila({
  server,
  onVer,
  onDetalle,
  onCredenciales,
  onEnlaces,
  onCompartir,
  puedeRepartir,
  onCredencial,
  onEdit,
  onDelete,
}: MenuProps) {
  const sinCredencial = server.users.length === 0
  // Cambios solo para quien gestiona la maquina; si no, darian 403
  const gestiona = puedeGestionar(server)
  const { etiqueta: accesos, icono: IconoDeAccesos } = accionDeAcceso(puedeRepartir)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${server.name}`}>
          <MoreVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sinCredencial && gestiona && (
          <>
            <DropdownMenuItem onSelect={onCredencial}>
              <KeyRoundIcon className="size-4" />
              Añadir credencial
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={onVer}>
          <EyeIcon className="size-4" />
          Ver
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDetalle}>
          <ServerIcon className="size-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCredenciales}>
          <KeyRoundIcon className="size-4" />
          Credenciales
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEnlaces}>
          <LinkIcon className="size-4" />
          Enlaces
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCompartir}>
          <IconoDeAccesos className="size-4" />
          {accesos}
        </DropdownMenuItem>
        {gestiona && (
          <>
            <DropdownMenuSeparator />
            {!sinCredencial && (
              <DropdownMenuItem onSelect={onCredencial}>
                <PlusIcon className="size-4" />
                Añadir credencial
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon className="size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2Icon className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Miembro sin concesiones: el acceso lo da quien administra. */
function SinAcceso() {
  return (
    <div className="flex flex-col items-center">
      <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
        <ServerIcon className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">
        Todavía no tiene acceso a ningún servidor
      </h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-center text-sm">
        Quien administra la organización se lo concede.
      </p>
    </div>
  )
}

/** Host key fijada en la primera conexion; despues debe coincidir. En
 *  linea con el nombre: si este salta, el escudo lo sigue. */
function HostKeyBadge({ fijada }: { fijada: boolean }) {
  const Icono = fijada ? ShieldCheckIcon : ShieldQuestionIcon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'ml-1.5 inline-flex align-middle',
            fijada ? 'text-success' : 'text-muted-foreground',
          )}
        >
          <Icono className="size-4" />
          <span className="sr-only">
            {fijada ? 'Servidor verificado' : 'Servidor sin verificar'}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {fijada
          ? 'Verificado. Si cambia su identidad, se bloquea la conexión.'
          : 'Se verifica en la primera conexión.'}
      </TooltipContent>
    </Tooltip>
  )
}
