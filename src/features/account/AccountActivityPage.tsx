import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ArrowLeftIcon, LaptopIcon, ListFilterIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { PeriodFilter, PeriodRange } from '@/components/period-filter'
import { PageHeader } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import {
  clavesActividad,
  DetalleDeActividad,
  estadoDeSesion,
  iconoDeActividad,
  type EstadoDeSesion,
} from '@/features/account/actividad'
import { iconoDeEquipo } from '@/features/account/equipos'
import * as authApi from '@/features/auth/api'
import { getSession } from '@/features/auth/token-store'
import { formatDateTime, formatRelative } from '@/lib/format'
import { conTodos, TODOS } from '@/lib/opciones-de-filtro'
import { resolverPeriodo, type Periodo } from '@/lib/periods'
import { useListado } from '@/lib/use-listado'
import type { AuditEntry } from '@/types/api'

const PERIODO_POR_DEFECTO: Periodo = 'mes'

const COLUMNAS: Columna<AuditEntry>[] = [
  {
    key: 'que',
    header: 'Qué pasó',
    rol: 'titulo',
    ancho: '27%',
    lineas: 2,
    cell: (entrada) => <QuePaso entrada={entrada} />,
  },
  {
    key: 'equipo',
    header: 'Equipo',
    ancho: '20%',
    cell: (entrada) => <Equipo nombre={entrada.device} />,
  },
  {
    key: 'ip',
    header: 'Dirección IP',
    desde: 'lg',
    ancho: '14%',
    cell: (entrada) => (
      <span className="font-machine text-muted-foreground text-xs">
        {entrada.ip_address ?? '—'}
      </span>
    ),
  },
  {
    key: 'sesion',
    header: 'Sesión',
    desde: 'md',
    ancho: '14%',
    cell: (entrada) => <Sesion entrada={entrada} />,
  },
  {
    key: 'fecha',
    header: 'Fecha',
    ancho: '20%',
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
]

/** Accesos y cambios de seguridad, con los filtros de la auditoría: para
 *  comparar equipos y direcciones y hallar lo que no se reconoce. */
export function AccountActivityPage() {
  const [porPagina, setPorPagina] = useState(20)
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_POR_DEFECTO)
  const listado = useListado({
    filtrosIniciales: {
      search: '',
      category: '',
      device: '',
      ...(resolverPeriodo(PERIODO_POR_DEFECTO) ?? { from: '', to: '' }),
    },
    modulo: 'actividad',
    vistaPorDefecto: 'tabla',
  })
  const { filtros, pagina, setPagina } = listado

  const actividad = useQuery({
    queryKey: clavesActividad.pagina(pagina, porPagina, listado.parametros),
    queryFn: () => authApi.fetchAccountActivity(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  // Otro tamaño vuelve a la página 1: una página alta quedaría vacía
  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  return (
    <div className="space-y-4">
      <Link
        to="/app/settings"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Configuración
      </Link>

      <PageHeader
        title="Actividad de la cuenta"
        description="Cada inicio y cierre de sesión, y cada cambio de seguridad. Si no reconoce alguno, cambie su contraseña."
      />

      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={actividad.isFetching}
        onLimpiar={() => {
          setPeriodo(PERIODO_POR_DEFECTO)
          listado.limpiarFiltros()
        }}
        onActualizar={() => actividad.refetch()}
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
          etiqueta="Buscar en la actividad"
          placeholder="Equipo o IP"
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
          opciones={conTodos('Tipos', actividad.data?.categories)}
        />
        <FiltroSelect
          icono={LaptopIcon}
          etiqueta="Filtrar por equipo"
          className="max-w-56"
          valor={filtros.device || TODOS}
          onChange={(valor) => listado.setFiltro('device', valor === TODOS ? '' : valor)}
          opciones={conTodos('Equipos', actividad.data?.devices)}
        />
      </FilterBar>

      <DataTable
        columnas={[columnaDeNumero<AuditEntry>(pagina, porPagina), ...COLUMNAS]}
        datos={actividad.data?.results ?? []}
        getKey={(entrada) => entrada.id}
        vista="tabla"
        cargando={actividad.isPending}
        error={actividad.error}
        onReintentar={() => actividad.refetch()}
        vacio={
          listado.hayFiltros
            ? 'Ningún registro coincide con ese filtro.'
            : 'Sin actividad este mes.'
        }
      />

      <Pagination
        pagina={pagina}
        total={actividad.data?.count ?? 0}
        porPagina={porPagina}
        etiqueta="registros"
        onCambiar={setPagina}
      />
    </div>
  )
}

/** Frase con icono; el detalle, debajo y en pequeño, como en la auditoría. */
function QuePaso({ entrada }: { entrada: AuditEntry }) {
  const Icono = iconoDeActividad(entrada.action)

  return (
    <span className="flex min-w-0 items-start gap-2.5">
      <Icono className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block">{entrada.description}</span>
        {entrada.detail && (
          <span className="text-muted-foreground block text-xs">
            <DetalleDeActividad entrada={entrada} />
          </span>
        )}
      </span>
    </span>
  )
}

function Equipo({ nombre }: { nombre: string }) {
  if (!nombre) return <span className="text-muted-foreground">—</span>
  const Icono = iconoDeEquipo(nombre)

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icono className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span>{nombre}</span>
    </span>
  )
}

/** Abierta: punto verde de «en línea»; cerrada: apagado. */
const ESTADOS: Record<EstadoDeSesion, { texto: string; clase: string; punto: string }> = {
  actual: { texto: 'Esta sesión', clase: 'font-medium', punto: 'bg-success' },
  abierta: { texto: 'Abierta', clase: '', punto: 'bg-success' },
  cerrada: {
    texto: 'Cerrada',
    clase: 'text-muted-foreground',
    punto: 'bg-muted-foreground/50',
  },
}

function idsDeLasAbiertas(sesiones: authApi.Sesion[]): ReadonlySet<string> {
  return new Set(sesiones.map((sesion) => sesion.id))
}

/** Misma consulta que «Sesiones abiertas»: lo cerrado allí se ve aquí. */
function Sesion({ entrada }: { entrada: AuditEntry }) {
  const abiertas = useQuery({
    queryKey: authApi.clavesSesion.todas,
    queryFn: authApi.fetchSessions,
    select: idsDeLasAbiertas,
  })

  if (abiertas.isPending) return <Skeleton className="h-3 w-16" />
  const estado = abiertas.data
    ? estadoDeSesion(entrada, abiertas.data, getSession()?.sessionId ?? null)
    : null
  if (!estado) return <span className="text-muted-foreground">—</span>

  const { texto, clase, punto } = ESTADOS[estado]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', clase)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', punto)} aria-hidden />
      {texto}
    </span>
  )
}
