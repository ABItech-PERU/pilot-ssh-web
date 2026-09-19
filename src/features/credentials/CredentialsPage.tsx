import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpDownIcon,
  FileTextIcon,
  FolderIcon,
  HistoryIcon,
  KeyRoundIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchXIcon,
  ServerIcon,
  TagIcon,
  TerminalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
import * as credentialsApi from '@/features/credentials/api'
import { CredentialAccessSheet } from '@/features/access/CredentialAccessSheet'
import { accionDeAcceso, puedeConectar, puedeGestionar } from '@/features/access/levels'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import { CredentialFormDialog } from '@/features/servers/CredentialFormDialog'
import { CredentialLabelsDialog } from '@/features/servers/CredentialLabelsDialog'
import { describeCredentialLoss } from '@/features/servers/deletion'
import * as serversApi from '@/features/servers/api'
import { toApiError } from '@/lib/api-error'
import { buildCredentialPath } from '@/features/credentials/paths'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { LabelChips } from '@/features/servers/LabelChips'
import { useLabelOptions } from '@/features/servers/use-label-options'
import { useServerOptions } from '@/features/servers/use-server-options'
import { LinkChips } from '@/features/servers/LinkChips'
import { buildServerPath } from '@/features/servers/paths'
import { CredentialLinksSheet } from '@/features/servers/LinksSheet'
import { buildTerminalPath } from '@/features/terminal/socket'
import { formatDateTime, formatRelative } from '@/lib/format'
import { useListado } from '@/lib/use-listado'
import type { ServerUser } from '@/types/api'

const POR_PAGINA = 25

const TIPOS = [
  { valor: 'todos', etiqueta: 'Todas las formas' },
  { valor: 'password', etiqueta: 'Con contraseña' },
  { valor: 'key', etiqueta: 'Con llave' },
] as const

/** «Por servidor» es el orden del backend: agrupa por maquina. */
const ORDENES = [
  { valor: '-last_session_at', etiqueta: 'Último uso' },
  { valor: 'servidor', etiqueta: 'Por servidor' },
  { valor: 'username', etiqueta: 'Usuario (A–Z)' },
  { valor: '-created_at', etiqueta: 'Más recientes' },
] as const

const TODOS_LOS_SERVIDORES = { valor: 'todos', etiqueta: 'Todos los servidores' }

/** Responde «¿en que maquina esta mi usuario?» sin abrir cada servidor. */
export function CredentialsPage() {
  const { slug, organization } = useCurrentOrganization()
  const navegar = useNavigate()
  const [enEdicion, setEnEdicion] = useState<ServerUser | null>(null)
  const [dandoDeAlta, setDandoDeAlta] = useState(false)
  const [enlacesDe, setEnlacesDe] = useState<ServerUser | null>(null)
  const [compartiendo, setCompartiendo] = useState<ServerUser | null>(null)
  const [etiquetasDe, setEtiquetasDe] = useState<ServerUser | null>(null)
  const [aBorrar, setABorrar] = useState<ServerUser | null>(null)
  const cliente = useQueryClient()
  const puedeRepartir = canManage(organization)
  const { etiqueta: accesos, icono: IconoDeAccesos } = accionDeAcceso(puedeRepartir)

  // Misma baja que en la ficha del servidor
  const eliminar = useMutation({
    mutationFn: serversApi.deleteCredential,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      toast.success('Credencial eliminada.')
      setABorrar(null)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const listado = useListado({
    modulo: 'credentials',
    // Muchas y comparables entre si: la tabla muestra mas de un vistazo
    vistaPorDefecto: 'tabla',
    filtrosIniciales: {
      search: '',
      auth_type: '',
      label: '',
      server_id: '',
      ordering: '-last_session_at',
    },
  })

  const { servidores, resuelta } = useServerOptions()
  const opcionesDeEtiqueta = useLabelOptions(
    credentialsApi.clavesCredencial.etiquetas,
    credentialsApi.fetchLabels,
  )

  const opcionesDeServidor = [
    TODOS_LOS_SERVIDORES,
    ...servidores.map((server) => ({ valor: server.id, etiqueta: server.name })),
  ]

  // Crear exige un servidor gestionable; si no, el alta daria 403
  const hayDondeCrear = !resuelta || servidores.some(puedeGestionar)

  // Al cambiar de organizacion se descarta el servidor filtrado: es de la
  // anterior y vaciaria la lista
  const [organizacionAnterior, setOrganizacionAnterior] = useState(slug)
  if (organizacionAnterior !== slug) {
    setOrganizacionAnterior(slug)
    listado.setFiltro('server_id', '')
  }

  const parametros: credentialsApi.FiltrosCredencial = {
    ...listado.parametros,
    ...(slug ? { organization: slug } : {}),
    page: listado.pagina,
  }

  const consulta = useQuery({
    queryKey: credentialsApi.clavesCredencial.todas(parametros),
    queryFn: () => credentialsApi.fetchCredentials(parametros),
    enabled: Boolean(slug),
    placeholderData: (anterior) => anterior,
  })

  const credenciales = consulta.data?.results ?? []

  const columnas: Columna<ServerUser>[] = [
    {
      key: 'username',
      header: 'Usuario',
      rol: 'titulo',
      ancho: '22%',
      cell: (credencial) => {
        const { icono: Icono, etiqueta } = FORMAS_DE_ENTRAR[credencial.auth_type]

        return (
          <div className="flex items-start gap-2">
            <Icono className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <Link
              to={buildCredentialPath(credencial.id)}
              className="focus-visible:outline-ring font-machine min-w-0 rounded font-medium break-words hover:underline focus-visible:-outline-offset-2 focus-visible:outline-1"
            >
              {credencial.username}
              <span className="sr-only"> · {etiqueta}</span>
            </Link>
          </div>
        )
      },
    },
    {
      key: 'server',
      header: 'Servidor',
      ancho: '16%',
      cell: (credencial) => (
        <div className="min-w-0 space-y-0.5">
          <Link
            to={buildServerPath(credencial.server)}
            className="group inline-flex max-w-full min-w-0 flex-col"
          >
            <span className="truncate text-sm font-medium group-hover:underline">
              {credencial.server_name}
            </span>
            <span className="font-machine text-muted-foreground text-xs">
              {credencial.server_ip}
            </span>
          </Link>
          {/* Carpeta de la terminal: va con la maquina, no con los enlaces */}
          {credencial.working_directory && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <FolderIcon className="size-3 shrink-0" />
              <span className="font-machine truncate">
                {credencial.working_directory}
              </span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'auth_type',
      header: 'Cómo entra',
      desde: 'lg',
      ancho: '12%',
      cell: (credencial) => (
        <Badge variant="secondary" className="font-normal">
          {FORMAS_DE_ENTRAR[credencial.auth_type].nombre}
        </Badge>
      ),
    },
    {
      // Columna propia, como en servidores: bajo el usuario descuadra la
      // tarjeta
      key: 'labels',
      header: 'Etiquetas',
      desde: 'xl',
      ancho: '16%',
      cell: (credencial) => (
        <LabelChips labels={credencial.labels} maximo={2} vacio="Ninguna" />
      ),
    },
    {
      key: 'links',
      header: 'Enlaces',
      desde: 'lg',
      ancho: '17%',
      cell: (credencial) => (
        <LinkChips links={credencial.links} maximo={2} vacio="Ninguno" />
      ),
    },
    {
      key: 'last_used',
      header: 'Último uso',
      desde: 'md',
      ancho: '11%',
      cell: (credencial) => (
        <span
          className="text-muted-foreground text-xs"
          title={formatDateTime(credencial.last_used_at)}
        >
          {formatRelative(credencial.last_used_at)}
        </span>
      ),
    },
    {
      key: 'sessions',
      header: 'Sesiones',
      desde: 'xl',
      alineacion: 'derecha',
      ancho: '6%',
      cell: (credencial) => (
        <span className="tabular-nums">{credencial.total_sessions}</span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      alineacion: 'derecha',
      ancho: '96px',
      acciones: 2,
      cell: (credencial) => (
        <div className="flex items-center justify-end gap-1">
          {/* Relleno, como en la fila del servidor: lleva a la terminal.
              28 px para no pesar mas que el nombre */}
          {puedeConectar(credencial) && (
            <Button
              size="icon-sm"
              className="size-7"
              aria-label={`Abrir terminal con ${credencial.username}`}
              onClick={() => navegar(buildTerminalPath(credencial.server, credencial.id))}
            >
              <TerminalIcon className="size-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
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
              <DropdownMenuItem
                onSelect={() => navegar(`${buildCredentialPath(credencial.id)}#sesiones`)}
              >
                <HistoryIcon className="size-4" />
                Sesiones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCompartiendo(credencial)}>
                <IconoDeAccesos className="size-4" />
                {accesos}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEnlacesDe(credencial)}>
                <LinkIcon className="size-4" />
                Enlaces
              </DropdownMenuItem>
              {puedeGestionar(credencial) && (
                <>
                  <DropdownMenuItem onSelect={() => setEtiquetasDe(credencial)}>
                    <TagIcon className="size-4" />
                    Etiquetas
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setEnEdicion(credencial)}>
                    <PencilIcon className="size-4" />
                    Editar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navegar(buildServerPath(credencial.server))}
              >
                <ServerIcon className="size-4" />
                Ver servidor
              </DropdownMenuItem>
              {puedeGestionar(credencial) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setABorrar(credencial)}
                  >
                    <Trash2Icon className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Credenciales"
        description={
          organization
            ? `Usuarios de acceso a cada servidor de ${organization.name}.`
            : 'Usuarios de acceso a cada servidor.'
        }
        action={
          hayDondeCrear && (
            <Button onClick={() => setDandoDeAlta(true)} disabled={!slug}>
              <PlusIcon />
              Añadir credencial
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
          etiqueta="Buscar credenciales"
          placeholder="Usuario o servidor"
          valor={listado.filtros.search}
          onChange={(valor) => listado.setFiltro('search', valor)}
        />
        <FiltroSelect
          icono={ServerIcon}
          etiqueta="Filtrar por servidor"
          className="max-w-56"
          valor={listado.filtros.server_id || 'todos'}
          onChange={(valor) =>
            listado.setFiltro('server_id', valor === 'todos' ? '' : valor)
          }
          opciones={opcionesDeServidor}
        />
        {/* Con etiquetas, filtrar por entorno sirve mas que por forma de
            entrar */}
        {opcionesDeEtiqueta.length > 1 ? (
          <FiltroSelect
            icono={TagIcon}
            etiqueta="Filtrar por etiqueta"
            valor={listado.filtros.label || 'todas'}
            onChange={(valor) =>
              listado.setFiltro('label', valor === 'todas' ? '' : valor)
            }
            opciones={opcionesDeEtiqueta}
          />
        ) : (
          <FiltroSelect
            icono={KeyRoundIcon}
            etiqueta="Filtrar por forma de entrar"
            valor={listado.filtros.auth_type || 'todos'}
            onChange={(valor) =>
              listado.setFiltro('auth_type', valor === 'todos' ? '' : valor)
            }
            opciones={TIPOS}
          />
        )}
        <FiltroSelect
          icono={ArrowUpDownIcon}
          etiqueta="Ordenar la lista"
          valor={listado.filtros.ordering || 'servidor'}
          onChange={(valor) =>
            listado.setFiltro('ordering', valor === 'servidor' ? '' : valor)
          }
          opciones={ORDENES}
        />
      </FilterBar>

      <DataTable
        columnas={columnas}
        datos={credenciales}
        getKey={(credencial) => credencial.id}
        vista={listado.vista}
        cargando={consulta.isPending}
        error={consulta.isError ? consulta.error : undefined}
        onReintentar={() => consulta.refetch()}
        filasEsperadas={credenciales.length || 5}
        vacio={
          <Vacio
            conFiltros={listado.hayFiltros}
            hayDondeCrear={hayDondeCrear}
            puedeRegistrar={canManage(organization)}
            onAnadir={() => setDandoDeAlta(true)}
          />
        }
      />

      <Pagination
        pagina={listado.pagina}
        total={consulta.data?.count ?? 0}
        porPagina={POR_PAGINA}
        etiqueta="credenciales"
        onCambiar={listado.setPagina}
      />

      <CredentialFormDialog
        server={null}
        open={dandoDeAlta}
        onOpenChange={setDandoDeAlta}
      />
      <CredentialFormDialog
        server={enEdicion ? { id: enEdicion.server, name: enEdicion.server_name } : null}
        credential={enEdicion}
        open={Boolean(enEdicion)}
        onOpenChange={(abierto) => !abierto && setEnEdicion(null)}
      />

      <CredentialLinksSheet
        credential={enlacesDe}
        open={Boolean(enlacesDe)}
        onOpenChange={(abierto) => !abierto && setEnlacesDe(null)}
      />

      <CredentialLabelsDialog
        credential={etiquetasDe}
        open={Boolean(etiquetasDe)}
        onOpenChange={(abierto) => !abierto && setEtiquetasDe(null)}
      />

      <CredentialAccessSheet
        credencial={compartiendo}
        open={compartiendo !== null}
        onOpenChange={(abierto) => !abierto && setCompartiendo(null)}
        puedeRepartir={puedeRepartir}
      />

      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(abierto) => !abierto && setABorrar(null)}
        titulo={`¿Eliminar ${aBorrar?.username ?? ''}?`}
        descripcion={`Deja de estar en ${aBorrar?.server_name ?? ''}.`}
        detalles={aBorrar ? describeCredentialLoss(aBorrar) : []}
        confirmacion={aBorrar?.username}
        accion="Eliminar credencial"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => aBorrar && eliminar.mutate(aBorrar.id)}
      />
    </div>
  )
}

/** Las credenciales se anaden desde su servidor, no desde aqui. */
function Vacio({
  conFiltros,
  hayDondeCrear,
  puedeRegistrar,
  onAnadir,
}: {
  conFiltros: boolean
  hayDondeCrear: boolean
  /** Registrar es de quien administra; al resto se le pide esperar. */
  puedeRegistrar: boolean
  onAnadir: () => void
}) {
  const Icono = conFiltros ? SearchXIcon : KeyRoundIcon

  return (
    <div className="flex flex-col items-center">
      <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
        <Icono className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">
        {conFiltros ? 'Ninguna credencial coincide' : 'Todavía no hay credenciales'}
      </h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {conFiltros
          ? 'Pruebe con otro texto o limpie los filtros.'
          : hayDondeCrear
            ? 'Es el usuario con el que se accede a cada servidor.'
            : puedeRegistrar
              ? 'Antes hay que registrar el servidor al que se accede.'
              : 'Las que le compartan aparecerán aquí.'}
      </p>
      {!conFiltros &&
        (hayDondeCrear ? (
          <Button className="mt-5" onClick={onAnadir}>
            <PlusIcon />
            Añadir credencial
          </Button>
        ) : puedeRegistrar ? (
          <Button asChild className="mt-5">
            <Link to="/app/servers">
              <ServerIcon />
              Registrar servidor
            </Link>
          </Button>
        ) : null)}
    </div>
  )
}
