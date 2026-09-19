import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleDotIcon,
  EyeIcon,
  FlaskConicalIcon,
  PackageIcon,
  RotateCwIcon,
  SearchXIcon,
  WebhookIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { toast } from 'sonner'

import { ColumnasMenu } from '@/components/columns-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { RowActions } from '@/components/row-actions'
import { EmptyState } from '@/components/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import {
  describirIntentos,
  describirProximoIntento,
  ESTADO_DEL_AVISO,
  sePuedeReprocesar,
} from '@/features/backoffice/operaciones'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { PaymentNoticePanel } from '@/features/backoffice/PaymentNoticePanel'
import { PlatformTopUpPanel } from '@/features/backoffice/PlatformTopUpPanel'
import { buildOperationsPath } from '@/features/backoffice/rutas'
import {
  EstadoBadge,
  FechaCelda,
  FiltroDePeriodo,
  usePeriodoDeListado,
} from '@/features/credits/partes'
import { toApiError } from '@/lib/api-error'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { PaymentNotice, PaymentNoticeStatus, PlatformTopUp } from '@/types/api'

/** Con pendientes se refresca sola: un reintento cambia el estado. */
const MS_CON_PENDIENTES = 15_000

const ESTADOS: { valor: string; etiqueta: string }[] = [
  { valor: TODOS, etiqueta: 'Todos los estados' },
  ...(
    Object.entries(ESTADO_DEL_AVISO) as [PaymentNoticeStatus, { etiqueta: string }][]
  ).map(([valor, { etiqueta }]) => ({ valor, etiqueta })),
]
const ORIGENES = [
  { valor: TODOS, etiqueta: 'Cualquier origen' },
  { valor: 'webhook', etiqueta: 'Aviso del proveedor' },
  { valor: 'reconciliation', etiqueta: 'Conciliación' },
]

/** Avisos del proveedor de pago: se revisan cuando alguien pagó y no se
 *  le acreditó. */
export function PaymentNoticesTab() {
  const { user } = useSession()

  if (!llevaFinanzas(user)) return <Navigate to={buildOperationsPath()} replace />

  return <AvisosDePago />
}

function AvisosDePago() {
  const cliente = useQueryClient()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', status: '', source: '', from: '', to: '' },
    modulo: 'plataforma-avisos-de-pago',
    vistaPorDefecto: 'tabla',
    avanzados: ['source', 'from', 'to'],
  })
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [detalle, setDetalle] = useState<PaymentNotice | null>(null)
  const [aReprocesar, setAReprocesar] = useState<PaymentNotice | null>(null)
  const [recarga, setRecarga] = useState<PlatformTopUp | null>(null)

  const resumen = useQuery({
    queryKey: platformApi.clavesPlataforma.resumenDeOperaciones(),
    queryFn: platformApi.fetchOperationsSummary,
  })

  const avisos = useQuery({
    queryKey: platformApi.clavesPlataforma.avisosDePago(
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => platformApi.fetchPaymentNotices(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
    refetchInterval: (consulta) =>
      consulta.state.data?.results.some((aviso) => aviso.status === 'pending')
        ? MS_CON_PENDIENTES
        : false,
  })

  const reprocesar = useMutation({
    mutationFn: (aviso: PaymentNotice) => platformApi.retryPaymentNotice(aviso.id),
    onSuccess: async (aviso) => {
      await cliente.invalidateQueries({
        queryKey: platformApi.clavesPlataforma.operaciones(),
      })
      setAReprocesar(null)
      setDetalle(aviso)
      if (aviso.status === 'pending')
        toast.success('Aviso en cola: se procesa en unos segundos.')
      else if (aviso.status === 'failed') toast.error(aviso.last_error || aviso.result)
      else toast.success(aviso.result || 'Aviso procesado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const verRecarga = useMutation({
    mutationFn: (aviso: PaymentNotice) => platformApi.fetchTopUp(aviso.topup!.id),
    onSuccess: (solicitud) => {
      setDetalle(null)
      setRecarga(solicitud)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const columnas: Columna<PaymentNotice>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'created_at',
      header: 'Recibido',
      prioridad: 1,
      ancho: '15%',
      lineas: 2,
      cell: (aviso) => <FechaCelda iso={aviso.created_at} />,
    },
    {
      key: 'topup',
      header: 'Recarga',
      rol: 'titulo',
      fija: true,
      ancho: '24%',
      lineas: 2,
      cell: (aviso) => (
        <span className="block min-w-0">
          {aviso.topup ? (
            <span className="block truncate text-sm">
              {aviso.topup.package_name} · {aviso.topup.organization.name}
            </span>
          ) : (
            <span className="text-muted-foreground block text-sm">Sin recarga</span>
          )}
          <span className="text-muted-foreground font-machine block truncate text-xs">
            {aviso.resource_type} {aviso.resource_id}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      prioridad: 2,
      ancho: '15%',
      lineas: 2,
      cell: (aviso) => {
        const estado = ESTADO_DEL_AVISO[aviso.status]
        const intentos = describirIntentos(aviso.attempts)
        return (
          <span className="block">
            <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
            {(intentos || (aviso.status === 'pending' && aviso.next_attempt_at)) && (
              <span className="text-muted-foreground mt-1 block text-xs">
                {aviso.status === 'pending' && aviso.next_attempt_at
                  ? describirProximoIntento(aviso.next_attempt_at)
                  : intentos}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'result',
      header: 'Qué pasó',
      prioridad: 3,
      desde: 'md',
      ancho: '32%',
      lineas: 2,
      cell: (aviso) =>
        aviso.last_error && aviso.status !== 'processed' ? (
          <span className="text-destructive line-clamp-2 text-sm whitespace-normal">
            {aviso.last_error}
          </span>
        ) : (
          <span className="line-clamp-2 text-sm whitespace-normal">
            {aviso.result || '—'}
          </span>
        ),
    },
    {
      key: 'source',
      header: 'Origen',
      porDefecto: false,
      prioridad: 8,
      ancho: '14%',
      lineas: 2,
      cell: (aviso) => (
        <span className="block min-w-0">
          <span className="block text-sm">{aviso.source_label}</span>
          {aviso.event && (
            <span className="text-muted-foreground font-machine block truncate text-xs">
              {aviso.event}
            </span>
          )}
        </span>
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
      cell: (aviso) => (
        <RowActions
          etiqueta={`del aviso ${aviso.resource_id}`}
          onVerDetalle={() => setDetalle(aviso)}
        >
          <DropdownMenuItem onSelect={() => setDetalle(aviso)}>
            <EyeIcon className="size-4" />
            Ver detalle
          </DropdownMenuItem>
          {aviso.topup && (
            <DropdownMenuItem onSelect={() => verRecarga.mutate(aviso)}>
              <PackageIcon className="size-4" />
              Ver la recarga
            </DropdownMenuItem>
          )}
          {sePuedeReprocesar(aviso) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setAReprocesar(aviso)}>
                <RotateCwIcon className="size-4" />
                Reprocesar
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    },
  ]
  const eleccion = useColumnas('plataforma-avisos-de-pago', columnas)

  return (
    <div className="space-y-4">
      {resumen.data?.payments_test_mode && (
        <Alert className="border-warning/40 bg-warning/10">
          <FlaskConicalIcon />
          <AlertTitle>Pagos en modo de prueba</AlertTitle>
          <AlertDescription>Los cobros de este servidor no son reales.</AlertDescription>
        </Alert>
      )}

      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={avisos.isFetching}
        onLimpiar={periodo.limpiar}
        onActualizar={() => avisos.refetch()}
        busqueda={
          <SearchInput
            valor={filtros.search}
            onChange={(valor) => setFiltro('search', valor)}
            placeholder="Buscar por organización o id del pago"
            etiqueta="Buscar en los avisos de pago"
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
            <PageSizeSelect
              valor={porPagina}
              onChange={(tamano) => {
                setPorPagina(tamano)
                setPagina(1)
              }}
            />
          </>
        }
        avanzadosActivos={listado.filtrosAvanzadosActivos}
        avanzados={
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Origen</Label>
              <FiltroSelect
                icono={WebhookIcon}
                etiqueta="Origen"
                className="w-full"
                valor={filtros.source || TODOS}
                onChange={(valor) => setFiltro('source', valor === TODOS ? '' : valor)}
                opciones={ORIGENES}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Periodo</Label>
              <FiltroDePeriodo
                className="w-full"
                periodo={periodo.periodo}
                rango={periodo.rango}
                onChange={periodo.cambiar}
              />
            </div>
          </>
        }
      >
        <FiltroSelect
          icono={CircleDotIcon}
          etiqueta="Estado"
          valor={filtros.status || TODOS}
          onChange={(valor) => setFiltro('status', valor === TODOS ? '' : valor)}
          opciones={ESTADOS}
        />
      </FilterBar>

      <DataTable
        columnas={eleccion.elegidas}
        datos={avisos.data?.results ?? []}
        getKey={(aviso) => aviso.id}
        vista="tabla"
        cargando={avisos.isPending}
        error={avisos.error}
        onReintentar={() => avisos.refetch()}
        filasEsperadas={Math.min(porPagina, avisos.data?.results.length || 3)}
        vacio={
          listado.hayFiltros ? (
            <EmptyState
              icon={SearchXIcon}
              title="Ningún aviso con esos filtros"
              description="Pruebe con otro estado, otro origen u otro periodo."
            />
          ) : (
            <EmptyState
              icon={WebhookIcon}
              title="Sin avisos todavía"
              description="Aquí llega cada aviso del proveedor de pago, con lo que se hizo con él."
            />
          )
        }
      />

      <Pagination
        pagina={pagina}
        total={avisos.data?.count ?? 0}
        porPagina={porPagina}
        etiqueta="avisos"
        onCambiar={setPagina}
      />

      <PaymentNoticePanel
        aviso={detalle}
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
        onReprocesar={setAReprocesar}
        onVerRecarga={(aviso) => verRecarga.mutate(aviso)}
        buscandoRecarga={verRecarga.isPending}
      />

      <PlatformTopUpPanel
        solicitud={recarga}
        open={recarga !== null}
        onOpenChange={(abierto) => !abierto && setRecarga(null)}
      />

      <ConfirmDialog
        open={aReprocesar !== null}
        onOpenChange={(abierto) => !abierto && setAReprocesar(null)}
        titulo="¿Reprocesar este aviso?"
        descripcion="Se vuelve a consultar el pago al proveedor y se aplica lo que diga, con otra ronda de reintentos. Lo ya acreditado no se acredita dos veces."
        accion="Reprocesar"
        pendiente={reprocesar.isPending}
        onConfirmar={() => aReprocesar && reprocesar.mutate(aReprocesar)}
      />
    </div>
  )
}
