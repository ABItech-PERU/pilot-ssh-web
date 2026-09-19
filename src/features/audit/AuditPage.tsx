import { useMutation, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  FileSpreadsheetIcon,
  ListFilterIcon,
  Loader2Icon,
  LockIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { PeriodFilter, PeriodRange } from '@/components/period-filter'
import { EmptyState, PageHeader } from '@/components/states'
import { Button } from '@/components/ui/button'
import * as auditApi from '@/features/audit/api'
import {
  esIntentoDenegado,
  iconoDeEntrada,
  nombreDelArchivo,
} from '@/features/audit/registro'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import { toApiError } from '@/lib/api-error'
import { descargarArchivo } from '@/lib/download'
import { formatDateTime, formatRelative } from '@/lib/format'
import { conTodos, TODOS } from '@/lib/opciones-de-filtro'
import { resolverPeriodo, type Periodo } from '@/lib/periods'
import { useListado } from '@/lib/use-listado'
import type { AuditEntry } from '@/types/api'

const TITULO = 'Auditoría'
const DESCRIPCION = 'Quién hizo qué, sobre qué y desde dónde.'
const PERIODO_POR_DEFECTO: Periodo = 'mes'

/** Solo para quien administra; al resto se le explica por qué, sin una
 *  tabla que el servidor negaría. */
export function AuditPage() {
  const { slug, organization } = useCurrentOrganization()

  if (!slug || !organization || !canManage(organization)) {
    return (
      <div className="space-y-6">
        <PageHeader title={TITULO} description={DESCRIPCION} />
        <EmptyState
          icon={LockIcon}
          title="Solo para quien administra"
          description="Dice quién entró a cada servidor. La ven el propietario y los administradores."
        />
      </div>
    )
  }

  // Por organización: filtros y página se reinician, sin datos de la anterior
  return <Registro key={slug} slug={slug} espacio={organization.name} />
}

const COLUMNAS: Columna<AuditEntry>[] = [
  {
    key: 'quien',
    header: 'Quién',
    ancho: '22%',
    lineas: 2,
    cell: (entrada) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{entrada.actor ?? 'Alguien'}</span>
        {entrada.actor_email && (
          <span
            className="text-muted-foreground block truncate text-xs"
            title={entrada.actor_email}
          >
            {entrada.actor_email}
          </span>
        )}
      </span>
    ),
  },
  {
    key: 'que',
    header: 'Qué pasó',
    rol: 'titulo',
    ancho: '40%',
    lineas: 2,
    cell: (entrada) => <QuePaso entrada={entrada} />,
  },
  {
    // Hora exacta visible: «hace 3 días» obliga a echar la cuenta
    key: 'cuando',
    header: 'Cuándo',
    ancho: '18%',
    lineas: 2,
    cell: (entrada) => (
      <span className="block">
        <span className="block text-sm">{formatDateTime(entrada.created_at)}</span>
        <span className="text-muted-foreground block text-xs">
          {formatRelative(entrada.created_at)}
        </span>
      </span>
    ),
  },
  {
    key: 'desde',
    header: 'Desde',
    desde: 'lg',
    ancho: '15%',
    cell: (entrada) => (
      <span className="font-machine text-muted-foreground text-xs">
        {entrada.ip_address ?? '—'}
      </span>
    ),
  },
]

function Registro({ slug, espacio }: { slug: string; espacio: string }) {
  const [porPagina, setPorPagina] = useState(20)
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_POR_DEFECTO)
  const listado = useListado({
    filtrosIniciales: {
      search: '',
      category: '',
      actor: '',
      ...(resolverPeriodo(PERIODO_POR_DEFECTO) ?? { from: '', to: '' }),
    },
    modulo: 'auditoria',
    vistaPorDefecto: 'tabla',
  })
  const { filtros, pagina, setPagina } = listado

  const registro = useQuery({
    queryKey: auditApi.clavesAuditoria.registro(
      slug,
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => auditApi.fetchAuditLog(slug, pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const exportar = useMutation({
    mutationFn: () => auditApi.exportAuditLog(slug, listado.parametros),
    onSuccess: (archivo) => {
      descargarArchivo(archivo, nombreDelArchivo(espacio))
      toast.success('Auditoría exportada.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  // Otro tamaño vuelve a la página 1: una página alta quedaría vacía
  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const total = registro.data?.count ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          <Button
            variant="outline"
            disabled={exportar.isPending || total === 0}
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

      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={registro.isFetching}
        onLimpiar={() => {
          setPeriodo(PERIODO_POR_DEFECTO)
          listado.limpiarFiltros()
        }}
        onActualizar={() => registro.refetch()}
        derecha={<PageSizeSelect valor={porPagina} onChange={cambiarTamano} />}
        avanzadosActivos={periodo === PERIODO_POR_DEFECTO ? 0 : 1}
        avanzados={
          <>
            <PeriodFilter
              conEtiqueta
              periodo={periodo}
              rango={{ from: filtros.from, to: filtros.to }}
              onChange={(siguiente, rango) => {
                setPeriodo(siguiente)
                listado.setFiltro('from', rango.from)
                listado.setFiltro('to', rango.to)
              }}
            />
            {periodo === 'personalizado' && (
              <PeriodRange
                rango={{ from: filtros.from, to: filtros.to }}
                onChange={(rango) => {
                  listado.setFiltro('from', rango.from)
                  listado.setFiltro('to', rango.to)
                }}
              />
            )}
          </>
        }
      >
        <SearchInput
          etiqueta="Buscar en la auditoría"
          placeholder="Persona, servidor o IP"
          valor={filtros.search}
          onChange={(valor) => listado.setFiltro('search', valor)}
        />
        <FiltroSelect
          icono={ListFilterIcon}
          etiqueta="Filtrar por tipo"
          valor={filtros.category || TODOS}
          onChange={(valor) =>
            listado.setFiltro('category', valor === TODOS ? '' : valor)
          }
          opciones={conTodos('Tipos', registro.data?.categories)}
        />
        <FiltroSelect
          icono={UserIcon}
          etiqueta="Filtrar por persona"
          className="max-w-56"
          valor={filtros.actor || TODOS}
          onChange={(valor) => listado.setFiltro('actor', valor === TODOS ? '' : valor)}
          opciones={conTodos('Personas', registro.data?.people)}
        />
      </FilterBar>

      <DataTable
        columnas={[columnaDeNumero<AuditEntry>(pagina, porPagina), ...COLUMNAS]}
        datos={registro.data?.results ?? []}
        getKey={(entrada) => entrada.id}
        vista="tabla"
        cargando={registro.isPending}
        error={registro.error}
        onReintentar={() => registro.refetch()}
        // Vacío según causa: sin datos o sin coincidencias
        vacio={
          listado.hayFiltros
            ? 'Ningún registro coincide con ese filtro.'
            : 'Sin actividad este mes.'
        }
      />

      <Pagination
        pagina={pagina}
        total={total}
        porPagina={porPagina}
        etiqueta="registros"
        onCambiar={setPagina}
      />
    </div>
  )
}

/** Frase con icono; el intento denegado, en rojo. El detalle, debajo y en
 *  pequeño: completa la frase sin competir con ella. */
function QuePaso({ entrada }: { entrada: AuditEntry }) {
  const Icono = iconoDeEntrada(entrada)
  const denegado = esIntentoDenegado(entrada)

  return (
    <span className="flex min-w-0 items-start gap-2.5">
      <Icono
        className={cn(
          'mt-0.5 size-4 shrink-0',
          denegado ? 'text-destructive' : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <span className="min-w-0">
        <span className={cn('block', denegado && 'text-destructive font-medium')}>
          {entrada.description}
        </span>
        {entrada.detail && (
          <span className="text-muted-foreground block text-xs">{entrada.detail}</span>
        )}
      </span>
    </span>
  )
}
