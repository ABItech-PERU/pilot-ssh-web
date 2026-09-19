import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  Building2Icon,
  CircleDotIcon,
  ClockIcon,
  EyeIcon,
  FolderOpenIcon,
  HandCoinsIcon,
  PackageIcon,
  ReceiptIcon,
  SearchXIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { ColumnasMenu } from '@/components/columns-menu'
import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { RowActions } from '@/components/row-actions'
import { EmptyState, PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { CreditGrantDialog } from '@/features/backoffice/CreditGrantDialog'
import {
  describirEstadoDeOrganizacion,
  ESTADOS_DE_ORGANIZACION,
} from '@/features/backoffice/organizaciones'
import { OrganizationPanel } from '@/features/backoffice/OrganizationPanel'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { buildCasePath, buildPlatformPath } from '@/features/backoffice/rutas'
import { EstadoBadge, FechaCelda, TINTE } from '@/features/credits/partes'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import { formatCredits } from '@/lib/format'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { PlatformOrganization } from '@/types/api'

const ESTADOS = [
  { valor: TODOS, etiqueta: 'Todos los estados' },
  ...ESTADOS_DE_ORGANIZACION,
]
const PENDIENTES = [
  { valor: TODOS, etiqueta: 'Con y sin recargas pendientes' },
  { valor: 'true', etiqueta: 'Solo con recargas pendientes' },
]
const NADA = <span className="text-muted-foreground">—</span>

/** Todas las organizaciones con saldo y responsable. El resumen se abre al
 *  lado; el caso entero, en su ficha. */
export function PlatformOrganizationsPage() {
  const { user } = useSession()
  const navegar = useNavigate()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', status: '', with_pending: '' },
    modulo: 'plataforma-organizaciones',
    vistaPorDefecto: 'tabla',
    avanzados: ['with_pending'],
  })
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [ficha, setFicha] = useState<PlatformOrganization | null>(null)
  const [asignando, setAsignando] = useState<PlatformOrganization | null>(null)
  const finanzas = llevaFinanzas(user)

  const organizaciones = useQuery({
    queryKey: platformApi.clavesPlataforma.organizaciones(
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => platformApi.fetchOrganizations(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const columnas: Columna<PlatformOrganization>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'organizacion',
      header: 'Organización',
      rol: 'titulo',
      fija: true,
      ancho: '26%',
      lineas: 2,
      cell: (organizacion) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <OrganizationAvatar organization={organizacion} />
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{organizacion.name}</span>
              {/* Lo intocable se anuncia en la fila, no con un error */}
              {organizacion.is_own && (
                <Badge variant="outline" className="shrink-0 font-normal">
                  Propia
                </Badge>
              )}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {organizacion.slug}
              {organizacion.is_personal && ' · espacio personal'}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'propietario',
      header: 'Propietario',
      desde: 'md',
      ancho: '20%',
      lineas: 2,
      prioridad: 2,
      cell: (organizacion) =>
        organizacion.owner ? (
          <span className="block min-w-0">
            <span className="block truncate">{organizacion.owner.name}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {organizacion.owner.email}
            </span>
          </span>
        ) : (
          NADA
        ),
    },
    {
      key: 'miembros',
      header: 'Miembros',
      alineacion: 'derecha',
      desde: 'lg',
      ancho: '9%',
      prioridad: 4,
      cell: (organizacion) => (
        <span className="tabular-nums">{organizacion.members_count}</span>
      ),
    },
    {
      key: 'saldo',
      header: 'Saldo',
      alineacion: 'derecha',
      ancho: '11%',
      prioridad: 1,
      cell: (organizacion) => (
        <span className="font-medium tabular-nums">
          {formatCredits(organizacion.balance)}
        </span>
      ),
    },
    {
      key: 'pendientes',
      header: 'Pendientes',
      alineacion: 'centro',
      desde: 'xl',
      ancho: '10%',
      prioridad: 3,
      cell: (organizacion) =>
        organizacion.pending_topups > 0 ? (
          <span
            className={cn(
              'inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
              TINTE.aviso,
            )}
          >
            {organizacion.pending_topups}
          </span>
        ) : (
          NADA
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      ancho: '11%',
      prioridad: 2,
      cell: (organizacion) => {
        const estado = describirEstadoDeOrganizacion(organizacion.status)
        return <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
      },
    },
    {
      key: 'servidores',
      header: 'Servidores',
      porDefecto: false,
      prioridad: 5,
      alineacion: 'derecha',
      ancho: '9%',
      cell: (organizacion) => (
        <span className="tabular-nums">{organizacion.servers_count}</span>
      ),
    },
    {
      key: 'ultima_recarga',
      header: 'Última recarga',
      porDefecto: false,
      prioridad: 5,
      ancho: '13%',
      lineas: 2,
      cell: (organizacion) =>
        organizacion.last_topup_at ? (
          <FechaCelda iso={organizacion.last_topup_at} />
        ) : (
          NADA
        ),
    },
    {
      key: 'creada',
      header: 'Creada',
      porDefecto: false,
      prioridad: 6,
      ancho: '13%',
      lineas: 2,
      cell: (organizacion) => <FechaCelda iso={organizacion.created_at} />,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      porDefecto: false,
      prioridad: 7,
      ancho: '9%',
      cell: (organizacion) => (organizacion.is_personal ? 'Personal' : 'Equipo'),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 2,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (organizacion) => (
        <RowActions
          etiqueta={`de ${organizacion.name}`}
          onVerDetalle={() => setFicha(organizacion)}
        >
          <DropdownMenuItem onSelect={() => setFicha(organizacion)}>
            <EyeIcon className="size-4" />
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navegar(buildCasePath(organizacion.slug))}>
            <FolderOpenIcon className="size-4" />
            Abrir ficha
          </DropdownMenuItem>
          {finanzas && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={organizacion.is_own}
                onSelect={() => setAsignando(organizacion)}
              >
                <HandCoinsIcon className="size-4" />
                Asignar créditos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navegar(buildPlatformPath('topups', organizacion.slug))}
              >
                <PackageIcon className="size-4" />
                Sus recargas
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  navegar(buildPlatformPath('transactions', organizacion.slug))
                }
              >
                <ReceiptIcon className="size-4" />
                Sus movimientos
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    },
  ]
  const eleccion = useColumnas('plataforma-organizaciones', columnas)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizaciones"
        description="Todas las cuentas, con su saldo y quién las lleva."
      />

      <div className="space-y-4">
        <FilterBar
          hayFiltros={listado.hayFiltros}
          cargando={organizaciones.isFetching}
          onLimpiar={listado.limpiarFiltros}
          onActualizar={() => organizaciones.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Buscar por nombre, dirección o correo"
              etiqueta="Buscar organizaciones"
            />
          }
          derecha={
            <>
              <ColumnasMenu
                columnas={columnas}
                visibles={eleccion.visibles}
                onAlternar={eleccion.alternar}
                onRestablecer={eleccion.restablecer}
              />
              <PageSizeSelect valor={porPagina} onChange={cambiarTamano} />
            </>
          }
          avanzadosActivos={listado.filtrosAvanzadosActivos}
          avanzados={
            <div className="space-y-1.5">
              <Label className="text-xs">Recargas pendientes</Label>
              <FiltroSelect
                icono={ClockIcon}
                etiqueta="Recargas pendientes"
                className="w-full"
                valor={filtros.with_pending || TODOS}
                onChange={(valor) =>
                  setFiltro('with_pending', valor === TODOS ? '' : valor)
                }
                opciones={PENDIENTES}
              />
            </div>
          }
        >
          <FiltroSelect
            icono={CircleDotIcon}
            etiqueta="Estado de la cuenta"
            valor={filtros.status || TODOS}
            onChange={(valor) => setFiltro('status', valor === TODOS ? '' : valor)}
            opciones={ESTADOS}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={organizaciones.data?.results ?? []}
          getKey={(organizacion) => organizacion.id}
          vista="tabla"
          cargando={organizaciones.isPending}
          error={organizaciones.error}
          onReintentar={() => organizaciones.refetch()}
          filasEsperadas={Math.min(porPagina, organizaciones.data?.results.length || 5)}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nada con esos filtros"
                description="Pruebe con otro nombre o estado, o límpielos."
              />
            ) : (
              <EmptyState
                icon={Building2Icon}
                title="Sin organizaciones"
                description="Aparecen en cuanto alguien crea su cuenta."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={organizaciones.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="organizaciones"
          onCambiar={setPagina}
        />
      </div>

      <OrganizationPanel
        organizacion={ficha}
        open={ficha !== null}
        onOpenChange={(abierta) => !abierta && setFicha(null)}
      />

      <CreditGrantDialog
        organizacion={asignando}
        open={asignando !== null}
        onOpenChange={(abierto) => !abierto && setAsignando(null)}
      />
    </div>
  )
}
