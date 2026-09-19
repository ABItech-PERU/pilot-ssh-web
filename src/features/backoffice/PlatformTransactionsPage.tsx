import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftRightIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  PackageIcon,
  ReceiptIcon,
  SearchXIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { ColumnasMenu } from '@/components/columns-menu'
import { CeldaCopiable } from '@/components/copy-cell'
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
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import {
  OrganizacionElegida,
  useOrganizacionDeUrl,
} from '@/features/backoffice/OrganizationFilter'
import { PlatformTopUpPanel } from '@/features/backoffice/PlatformTopUpPanel'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { buildPlatformPath } from '@/features/backoffice/rutas'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import { TransactionPanel } from '@/features/backoffice/TransactionPanel'
import {
  autorDe,
  conceptoDe,
  ladoDe,
  NOMBRE_DEL_TIPO,
  TIPOS_DE_MOVIMIENTO,
} from '@/features/credits/movimientos'
import {
  FechaCelda,
  FiltroDePeriodo,
  Importe,
  LadoBadge,
  usePeriodoDeListado,
} from '@/features/credits/partes'
import { toApiError } from '@/lib/api-error'
import { descargarArchivo, nombreDeArchivo } from '@/lib/download'
import { formatCredits } from '@/lib/format'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { PlatformTopUp, PlatformTransaction } from '@/types/api'

const TIPOS = [{ valor: TODOS, etiqueta: 'Todos los tipos' }, ...TIPOS_DE_MOVIMIENTO]
const TITULO = 'Movimientos'
const DESCRIPCION = 'El libro mayor de todas las organizaciones.'
const NADA = <span className="text-muted-foreground">—</span>

/** Libro mayor de todas las organizaciones. Se exporta con los mismos
 *  filtros. */
export function PlatformTransactionsPage() {
  const { user } = useSession()

  if (!llevaFinanzas(user))
    return (
      <SinPermiso
        titulo={TITULO}
        descripcion={DESCRIPCION}
        permiso="can_manage_finances"
      />
    )

  return <Movimientos />
}

function Movimientos() {
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const [porPagina, setPorPagina] = useState(20)
  const [detalle, setDetalle] = useState<PlatformTransaction | null>(null)
  const [recarga, setRecarga] = useState<PlatformTopUp | null>(null)
  const listado = useListado({
    filtrosIniciales: { search: '', organization: '', kind: '', from: '', to: '' },
    modulo: 'plataforma-movimientos',
    vistaPorDefecto: 'tabla',
    avanzados: ['organization', 'from', 'to'],
  })
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado
  const organizacionDeUrl = useOrganizacionDeUrl(setFiltro)

  const movimientos = useQuery({
    queryKey: platformApi.clavesPlataforma.movimientos(
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => platformApi.fetchTransactions(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const exportar = useMutation({
    mutationFn: () => platformApi.exportTransactions(listado.parametros),
    onSuccess: (archivo) => {
      descargarArchivo(
        archivo,
        nombreDeArchivo('Movimientos', filtros.organization || 'Plataforma'),
      )
      toast.success('Movimientos exportados.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  /** Recarga del movimiento; la de una devolución se busca por la
   *  referencia del pago. Bajo demanda, no una consulta por fila. */
  const verRecarga = useMutation({
    mutationFn: (movimiento: PlatformTransaction) =>
      movimiento.topup
        ? cliente.fetchQuery({
            queryKey: platformApi.clavesPlataforma.recarga(movimiento.topup.id),
            queryFn: () => platformApi.fetchTopUp(movimiento.topup!.id),
          })
        : platformApi.fetchTopUpByReference(movimiento.reference),
    onSuccess: (encontrada) => {
      if (!encontrada) {
        toast.error('No se encontró la recarga de ese movimiento.')
        return
      }
      setDetalle(null)
      setRecarga(encontrada)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const columnas: Columna<PlatformTransaction>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'fecha',
      header: 'Fecha',
      ancho: '15%',
      lineas: 2,
      prioridad: 2,
      cell: (movimiento) => <FechaCelda iso={movimiento.created_at} />,
    },
    {
      key: 'organizacion',
      header: 'Organización',
      rol: 'titulo',
      fija: true,
      ancho: '19%',
      lineas: 2,
      cell: (movimiento) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">
            {movimiento.organization.name}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {movimiento.organization.slug}
          </span>
        </span>
      ),
    },
    {
      key: 'concepto',
      header: 'Concepto',
      desde: 'md',
      ancho: '24%',
      lineas: 2,
      prioridad: 1,
      cell: (movimiento) => {
        const autor = autorDe(movimiento)
        return (
          <span className="block min-w-0">
            <span className="block truncate">{conceptoDe(movimiento)}</span>
            {autor && (
              <span className="text-muted-foreground block truncate text-xs">
                Por {autor}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'tipo',
      header: 'Tipo',
      desde: 'lg',
      ancho: '12%',
      prioridad: 3,
      cell: (movimiento) => (
        <LadoBadge
          lado={ladoDe(movimiento)}
          etiqueta={NOMBRE_DEL_TIPO[movimiento.kind]}
        />
      ),
    },
    {
      key: 'importe',
      header: 'Importe',
      alineacion: 'derecha',
      ancho: '11%',
      prioridad: 1,
      cell: (movimiento) => <Importe cantidad={movimiento.amount} />,
    },
    {
      key: 'saldo',
      header: 'Saldo',
      alineacion: 'derecha',
      desde: 'xl',
      ancho: '11%',
      prioridad: 4,
      cell: (movimiento) => (
        <span className="text-muted-foreground tabular-nums">
          {formatCredits(movimiento.balance_after)}
        </span>
      ),
    },
    {
      key: 'quien',
      header: 'Quién',
      porDefecto: false,
      prioridad: 5,
      ancho: '14%',
      cell: (movimiento) => movimiento.actor ?? NADA,
    },
    {
      key: 'referencia',
      header: 'Referencia',
      porDefecto: false,
      prioridad: 6,
      ancho: '16%',
      cell: (movimiento) =>
        movimiento.reference ? (
          <CeldaCopiable valor={movimiento.reference} etiqueta="la referencia" />
        ) : (
          NADA
        ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 2,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (movimiento) => (
        <RowActions
          etiqueta={`del movimiento de ${movimiento.organization.name}`}
          onVerDetalle={() => setDetalle(movimiento)}
        >
          <DropdownMenuItem onSelect={() => setDetalle(movimiento)}>
            <EyeIcon className="size-4" />
            Ver detalle
          </DropdownMenuItem>
          {(movimiento.topup || movimiento.reference) && (
            <DropdownMenuItem onSelect={() => verRecarga.mutate(movimiento)}>
              <PackageIcon className="size-4" />
              Ver la recarga
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() =>
              navegar(buildPlatformPath('topups', movimiento.organization.slug))
            }
          >
            <ReceiptIcon className="size-4" />
            Sus recargas
          </DropdownMenuItem>
        </RowActions>
      ),
    },
  ]
  const eleccion = useColumnas('plataforma-movimientos', columnas)

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          <Button
            variant="outline"
            disabled={exportar.isPending || !movimientos.data?.count}
            onClick={() => exportar.mutate()}
          >
            {exportar.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <FileSpreadsheetIcon />
            )}
            Exportar a Excel
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterBar
          hayFiltros={listado.hayFiltros}
          cargando={movimientos.isFetching}
          onLimpiar={() => {
            periodo.limpiar()
            organizacionDeUrl.quitar()
          }}
          onActualizar={() => movimientos.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Buscar por organización"
              etiqueta="Buscar movimientos"
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
            <>
              {filtros.organization && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Organización</Label>
                  <OrganizacionElegida
                    className="w-full"
                    slug={filtros.organization}
                    onQuitar={organizacionDeUrl.quitar}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Periodo</Label>
                <div className="flex flex-wrap gap-2">
                  <FiltroDePeriodo
                    className="w-full"
                    periodo={periodo.periodo}
                    rango={periodo.rango}
                    onChange={periodo.cambiar}
                  />
                </div>
              </div>
            </>
          }
        >
          <FiltroSelect
            icono={ArrowLeftRightIcon}
            etiqueta="Tipo de movimiento"
            valor={filtros.kind || TODOS}
            onChange={(valor) => setFiltro('kind', valor === TODOS ? '' : valor)}
            opciones={TIPOS}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={movimientos.data?.results ?? []}
          getKey={(movimiento) => movimiento.id}
          vista="tabla"
          cargando={movimientos.isPending}
          error={movimientos.error}
          onReintentar={() => movimientos.refetch()}
          filasEsperadas={Math.min(
            porPagina,
            movimientos.data?.results.length || porPagina,
          )}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nada con esos filtros"
                description="Pruebe con otra organización, tipo o periodo, o límpielos."
              />
            ) : (
              <EmptyState
                icon={ReceiptIcon}
                title="Sin movimientos"
                description="Aquí aparecerán las recargas y el uso de todas las organizaciones."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={movimientos.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="movimientos"
          onCambiar={setPagina}
        />
      </div>

      <TransactionPanel
        movimiento={detalle}
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
        onVerRecarga={(movimiento) => verRecarga.mutate(movimiento)}
        buscandoRecarga={verRecarga.isPending}
      />

      {/* Solo lectura: acreditar y cancelar se hacen en Recargas */}
      <PlatformTopUpPanel
        solicitud={recarga}
        open={recarga !== null}
        onOpenChange={(abierto) => !abierto && setRecarga(null)}
      />
    </div>
  )
}
