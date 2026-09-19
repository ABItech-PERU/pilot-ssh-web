import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  BanknoteIcon,
  CheckIcon,
  CircleDotIcon,
  ClockIcon,
  CreditCardIcon,
  EyeIcon,
  HandCoinsIcon,
  PackageIcon,
  PaperclipIcon,
  SearchXIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

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
import { CreditGrantDialog } from '@/features/backoffice/CreditGrantDialog'
import {
  OrganizacionElegida,
  useOrganizacionDeUrl,
} from '@/features/backoffice/OrganizationFilter'
import { PlatformTopUpPanel } from '@/features/backoffice/PlatformTopUpPanel'
import {
  COBROS,
  describirCobro,
  esperaCobroPorFuera,
  type MedioDeCobro,
} from '@/features/backoffice/recargas'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { ChargeDetailsDialog } from '@/features/backoffice/ChargeDetailsDialog'
import { SellTopUpDialog, type Venta } from '@/features/backoffice/SellTopUpDialog'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import { TopUpResolution, type Resolucion } from '@/features/backoffice/TopUpResolution'
import { describirMetodo, METODOS } from '@/features/credits/metodos'
import {
  EstadoBadge,
  FechaCelda,
  FiltroDePeriodo,
  usePeriodoDeListado,
} from '@/features/credits/partes'
import { describirRecarga, ESTADOS_DE_RECARGA } from '@/features/credits/recargas'
import { formatCredits, formatPrice } from '@/lib/format'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { PlatformTopUp } from '@/types/api'

const ESTADOS = [{ valor: TODOS, etiqueta: 'Todos los estados' }, ...ESTADOS_DE_RECARGA]
const MEDIOS = [{ valor: TODOS, etiqueta: 'Todos los cobros' }, ...COBROS]
const METODOS_DE_PAGO = [{ valor: TODOS, etiqueta: 'Todos los medios' }, ...METODOS]
const TITULO = 'Recargas'
const DESCRIPCION =
  'Las de todas las organizaciones. Las cobradas por fuera se acreditan aquí.'
const NADA = <span className="text-muted-foreground">—</span>

type OrganizacionDeRecarga = PlatformTopUp['organization']

/** Recargas de todas las organizaciones. Las cobradas por fuera se
 *  acreditan aquí; las pagadas en línea las cierra el proveedor. */
export function PlatformTopUpsPage() {
  const { user } = useSession()

  if (!llevaFinanzas(user))
    return (
      <SinPermiso
        titulo={TITULO}
        descripcion={DESCRIPCION}
        permiso="can_manage_finances"
      />
    )

  return <Recargas />
}

function Recargas() {
  const { user } = useSession()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: {
      search: '',
      organization: '',
      status: '',
      charge: '',
      method: '',
      from: '',
      to: '',
    },
    modulo: 'plataforma-recargas',
    vistaPorDefecto: 'tabla',
    avanzados: ['organization', 'charge', 'method', 'from', 'to'],
  })
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado
  const organizacionDeUrl = useOrganizacionDeUrl(setFiltro)
  const [detalle, setDetalle] = useState<PlatformTopUp | null>(null)
  const [resolucion, setResolucion] = useState<Resolucion | null>(null)
  // `null`: cerrado. `{ organizacion: null }`: abierto, se elige dentro
  const [asignando, setAsignando] = useState<{
    organizacion: OrganizacionDeRecarga | null
  } | null>(null)
  const [venta, setVenta] = useState<Venta | null>(null)
  const [documentando, setDocumentando] = useState<PlatformTopUp | null>(null)
  const finanzas = llevaFinanzas(user)

  const recargas = useQuery({
    queryKey: platformApi.clavesPlataforma.recargas(
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => platformApi.fetchTopUps(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  // Organización a la que se acota la lista, si la hay
  const deLaLista = filtros.organization
    ? (recargas.data?.results.find(
        (fila) => fila.organization.slug === filtros.organization,
      )?.organization ?? { name: filtros.organization, slug: filtros.organization })
    : null

  const resolver = (solicitud: PlatformTopUp, accion: Resolucion['accion']) => {
    setDetalle(null)
    setResolucion({ solicitud, accion })
  }

  const columnas: Columna<PlatformTopUp>[] = [
    // Número estrecho: en lg cada columna cuenta
    { ...columnaDeNumero(pagina, porPagina), ancho: '4%' },
    {
      key: 'fecha',
      header: 'Pedida',
      ancho: '12%',
      lineas: 2,
      prioridad: 3,
      cell: (solicitud) => <FechaCelda iso={solicitud.created_at} />,
    },
    {
      key: 'organizacion',
      header: 'Organización',
      rol: 'titulo',
      fija: true,
      ancho: '18%',
      lineas: 2,
      cell: (solicitud) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">
            {solicitud.organization.name}
          </span>
          {solicitud.requested_by && (
            <span className="text-muted-foreground block truncate text-xs">
              Por {solicitud.requested_by}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'paquete',
      header: 'Paquete',
      desde: 'md',
      ancho: '13%',
      prioridad: 4,
      cell: (solicitud) => (
        <span className="block truncate">{solicitud.package_name}</span>
      ),
    },
    {
      // Lo primero que mira finanzas: la pasarela se revisa allí; lo de
      // fuera se cuadra con su número de operación
      key: 'cobro',
      header: 'Cobro',
      desde: 'md',
      ancho: '16%',
      lineas: 2,
      prioridad: 2,
      cell: (solicitud) => <CobroCelda solicitud={solicitud} />,
    },
    {
      key: 'importe',
      header: 'Importe',
      alineacion: 'derecha',
      ancho: '9%',
      prioridad: 1,
      cell: (solicitud) => (
        <span className="tabular-nums">
          {formatPrice(solicitud.price_amount, solicitud.price_currency)}
        </span>
      ),
    },
    {
      key: 'creditos',
      header: 'Créditos',
      alineacion: 'derecha',
      desde: 'xl',
      ancho: '8%',
      prioridad: 6,
      cell: (solicitud) => (
        <span className="tabular-nums">{formatCredits(solicitud.credits)}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      ancho: '13%',
      prioridad: 1,
      cell: (solicitud) => {
        const estado = describirRecarga(solicitud)
        return <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
      },
    },
    {
      key: 'medio',
      header: 'Medio de pago',
      porDefecto: false,
      prioridad: 5,
      ancho: '12%',
      cell: (solicitud) => describirMetodo(solicitud) ?? NADA,
    },
    {
      key: 'acreditada',
      header: 'Acreditada',
      porDefecto: false,
      prioridad: 7,
      ancho: '13%',
      lineas: 2,
      cell: (solicitud) =>
        solicitud.completed_at ? <FechaCelda iso={solicitud.completed_at} /> : NADA,
    },
    {
      key: 'devuelto',
      header: 'Devuelto',
      porDefecto: false,
      prioridad: 8,
      alineacion: 'derecha',
      ancho: '9%',
      cell: (solicitud) =>
        Number(solicitud.refunded_amount) > 0 ? (
          <span className="tabular-nums">
            {formatPrice(solicitud.refunded_amount, solicitud.price_currency)}
          </span>
        ) : (
          NADA
        ),
    },
    {
      key: 'pedida_por',
      header: 'Pedida por',
      porDefecto: false,
      prioridad: 8,
      ancho: '12%',
      cell: (solicitud) => solicitud.requested_by ?? NADA,
    },
    {
      key: 'referencia',
      header: 'Referencia',
      porDefecto: false,
      prioridad: 9,
      ancho: '14%',
      cell: (solicitud) =>
        solicitud.external_id || solicitud.manual_reference ? (
          <CeldaCopiable
            valor={solicitud.external_id || solicitud.manual_reference}
            etiqueta="la referencia"
          />
        ) : (
          NADA
        ),
    },
    {
      // El ojo abre la ficha; en el menú, primero la acción del estado
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 2,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (solicitud) => {
        // Las de una organización propia las resuelve otra persona
        const resuelve = finanzas && !solicitud.is_own
        // Abandonada en línea: solo en la ficha, con su aviso
        const aMano = esperaCobroPorFuera(solicitud) && resuelve
        return (
          <RowActions
            etiqueta={`de la recarga de ${solicitud.organization.name}`}
            onVerDetalle={() => setDetalle(solicitud)}
          >
            {aMano && (
              <>
                {/* Lo pedido o lo pagado: con tarjeta rechazada, el
                    cliente suele pagar otro importe */}
                <DropdownMenuItem onSelect={() => resolver(solicitud, 'complete')}>
                  <CheckIcon className="size-4" />
                  Acreditar{' '}
                  {formatPrice(solicitud.price_amount, solicitud.price_currency)}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setVenta({
                      organizacion: solicitud.organization,
                      sustituye: solicitud,
                    })
                  }
                >
                  <BanknoteIcon className="size-4" />
                  Cobró otro importe…
                </DropdownMenuItem>
              </>
            )}
            {/* Operación y comprobante se completan o corrigen después */}
            {resuelve && describirCobro(solicitud).medio === 'por-fuera' && (
              <DropdownMenuItem onSelect={() => setDocumentando(solicitud)}>
                <PaperclipIcon className="size-4" />
                Datos del cobro
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setDetalle(solicitud)}>
              <EyeIcon className="size-4" />
              Ver detalle
            </DropdownMenuItem>
            {/* Quien revisa una recarga que no llega suele compensarla */}
            {resuelve && (
              <DropdownMenuItem
                onSelect={() => setAsignando({ organizacion: solicitud.organization })}
              >
                <HandCoinsIcon className="size-4" />
                Asignar créditos
              </DropdownMenuItem>
            )}
            {aMano && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => resolver(solicitud, 'cancel')}
              >
                <XIcon className="size-4" />
                Cancelar recarga
              </DropdownMenuItem>
            )}
          </RowActions>
        )
      },
    },
  ]
  const eleccion = useColumnas('plataforma-recargas', columnas)

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          // Con la lista acotada, abre sobre esa organización
          finanzas && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setAsignando({ organizacion: deLaLista })}
              >
                <HandCoinsIcon />
                Asignar créditos
              </Button>
              <Button
                onClick={() => setVenta({ organizacion: deLaLista, sustituye: null })}
              >
                <BanknoteIcon />
                Registrar cobro
              </Button>
            </div>
          )
        }
      />

      <div className="space-y-4">
        <FilterBar
          hayFiltros={listado.hayFiltros}
          cargando={recargas.isFetching}
          onLimpiar={() => {
            periodo.limpiar()
            organizacionDeUrl.quitar()
          }}
          onActualizar={() => recargas.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Organización, referencia u operación"
              etiqueta="Buscar recargas"
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
              <div className="space-y-1.5">
                <Label className="text-xs">Cómo se cobró</Label>
                <FiltroSelect
                  icono={HandCoinsIcon}
                  etiqueta="Cómo se cobró"
                  className="w-full"
                  valor={filtros.charge || TODOS}
                  onChange={(valor) => setFiltro('charge', valor === TODOS ? '' : valor)}
                  opciones={MEDIOS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Medio de pago</Label>
                <FiltroSelect
                  icono={CreditCardIcon}
                  etiqueta="Medio de pago"
                  className="w-full"
                  valor={filtros.method || TODOS}
                  onChange={(valor) => setFiltro('method', valor === TODOS ? '' : valor)}
                  opciones={METODOS_DE_PAGO}
                />
              </div>
            </>
          }
        >
          <FiltroSelect
            icono={CircleDotIcon}
            etiqueta="Estado de la recarga"
            valor={filtros.status || TODOS}
            onChange={(valor) => setFiltro('status', valor === TODOS ? '' : valor)}
            opciones={ESTADOS}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={recargas.data?.results ?? []}
          getKey={(solicitud) => solicitud.id}
          vista="tabla"
          cargando={recargas.isPending}
          error={recargas.error}
          onReintentar={() => recargas.refetch()}
          filasEsperadas={Math.min(porPagina, recargas.data?.results.length || 5)}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nada con esos filtros"
                description="Pruebe con otra organización, estado o periodo, o límpielos."
              />
            ) : (
              <EmptyState
                icon={PackageIcon}
                title="Sin recargas"
                description="Aparecen en cuanto una organización pide la primera."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={recargas.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="recargas"
          onCambiar={setPagina}
        />
      </div>

      <PlatformTopUpPanel
        solicitud={detalle}
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
        onResolver={resolver}
      />

      <TopUpResolution resolucion={resolucion} onClose={() => setResolucion(null)} />

      <CreditGrantDialog
        organizacion={asignando?.organizacion ?? null}
        open={asignando !== null}
        onOpenChange={(abierto) => !abierto && setAsignando(null)}
      />

      <SellTopUpDialog venta={venta} onClose={() => setVenta(null)} />

      <ChargeDetailsDialog
        solicitud={documentando}
        onClose={() => setDocumentando(null)}
      />
    </div>
  )
}

const ICONO_DEL_COBRO: Record<MedioDeCobro, LucideIcon> = {
  pasarela: CreditCardIcon,
  'por-fuera': HandCoinsIcon,
  'por-cobrar': ClockIcon,
  'sin-cobrar': HandCoinsIcon,
  'sin-pagar': CreditCardIcon,
}

/** Ámbar: espera a finanzas. Gris: abandonada en línea, nada que cobrar. */
const COLOR_DEL_COBRO: Partial<Record<MedioDeCobro, string>> = {
  'por-cobrar': 'text-warning',
  'sin-cobrar': 'text-muted-foreground',
  'sin-pagar': 'text-muted-foreground',
}

function CobroCelda({ solicitud }: { solicitud: PlatformTopUp }) {
  const cobro = describirCobro(solicitud)
  const Icono = ICONO_DEL_COBRO[cobro.medio]

  return (
    <span className="block min-w-0">
      <span className={cn('flex items-center gap-1.5', COLOR_DEL_COBRO[cobro.medio])}>
        <Icono className="size-3.5 shrink-0" />
        <span className="truncate">{cobro.etiqueta}</span>
      </span>
      {cobro.detalle && (
        <span
          className={cn(
            'text-muted-foreground block truncate text-xs',
            cobro.medio === 'por-fuera' && 'font-machine',
          )}
        >
          {cobro.detalle}
        </span>
      )}
    </span>
  )
}
