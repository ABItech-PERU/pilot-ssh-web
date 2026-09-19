import { useQuery, type QueryKey } from '@tanstack/react-query'
import { ActivityIcon, KeyRoundIcon } from 'lucide-react'
import { useState } from 'react'

import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { PeriodFilter, PeriodRange } from '@/components/period-filter'
import type { FiltrosDeHistorial } from '@/features/servers/api'
import { EstadoDeSesion } from '@/features/servers/server-parts'
import { ESTADOS_DE_SESION } from '@/features/servers/sessions'
import { formatDateTime, formatRelative } from '@/lib/format'
import { resolverPeriodo, type Periodo } from '@/lib/periods'
import { useListado } from '@/lib/use-listado'
import type { Paginated, TerminalSession } from '@/types/api'

const TODAS = 'todas'
const PERIODO_POR_DEFECTO: Periodo = 'mes'

const ESTADOS = [
  { valor: TODAS, etiqueta: 'Estados' },
  ...Object.entries(ESTADOS_DE_SESION).map(([clave, { etiqueta }]) => ({
    valor: clave,
    etiqueta,
  })),
]

interface Props {
  /** Del servidor o de una credencial. */
  clave: (pagina: number, porPagina: number, filtros: FiltrosDeHistorial) => QueryKey
  pedir: (
    pagina: number,
    porPagina: number,
    filtros: FiltrosDeHistorial,
  ) => Promise<Paginated<TerminalSession>>
  /** Activa columna y filtro de credencial. */
  credenciales?: { id: string; username: string }[]
  /** Acota las filas del esqueleto. */
  total: number
}

/** Tabla y no lista: aquí se compara quién entra más y qué falla.
 *  Compartida por servidor y credencial. */
export function SessionsHistory({ clave, pedir, credenciales, total }: Props) {
  const [porPagina, setPorPagina] = useState(20)
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_POR_DEFECTO)
  const listado = useListado({
    filtrosIniciales: {
      search: '',
      status: '',
      credential: '',
      ...(resolverPeriodo(PERIODO_POR_DEFECTO) ?? { from: '', to: '' }),
    },
    modulo: 'sesiones',
    vistaPorDefecto: 'tabla',
  })
  const { filtros, pagina, setPagina } = listado

  const historial = useQuery({
    queryKey: clave(pagina, porPagina, listado.parametros),
    queryFn: () => pedir(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const columnas: Columna<TerminalSession>[] = [
    columnaDeNumero<TerminalSession>(pagina, porPagina),
    {
      key: 'quien',
      header: 'Quién entró',
      rol: 'titulo',
      ancho: '23%',
      cell: (sesion) => (
        <span className="truncate font-medium">{sesion.opened_by_name ?? 'Alguien'}</span>
      ),
    },
    ...(credenciales
      ? [
          {
            key: 'credencial',
            header: 'Credencial',
            ancho: '18%',
            cell: (sesion: TerminalSession) => (
              <span className="font-machine text-muted-foreground text-[13px]">
                {sesion.username ?? '—'}
              </span>
            ),
          },
        ]
      : []),
    {
      // Fecha exacta, no relativa: el historial se consulta para saber cuándo
      key: 'inicio',
      header: 'Inicio',
      ancho: '20%',
      lineas: 2,
      cell: (sesion) => (
        <span className="block">
          <span className="block text-sm">{formatDateTime(sesion.started_at)}</span>
          <span className="text-muted-foreground block text-xs">
            {formatRelative(sesion.started_at)}
          </span>
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      ancho: '14%',
      cell: (sesion) => <EstadoDeSesion status={sesion.status} />,
    },
    {
      key: 'ip',
      header: 'Desde',
      desde: 'lg',
      ancho: '12%',
      cell: (sesion) => (
        <span className="font-machine text-muted-foreground text-xs">
          {sesion.client_ip ?? '—'}
        </span>
      ),
    },
    {
      key: 'duracion',
      header: 'Duración',
      alineacion: 'derecha',
      ancho: '8%',
      cell: (sesion) => <span className="tabular-nums">{sesion.duration}</span>,
    },
  ]

  // Cambiar el tamaño vuelve a la primera página: evita una página vacía
  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  return (
    <div className="space-y-4">
      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={historial.isFetching}
        onLimpiar={() => {
          setPeriodo(PERIODO_POR_DEFECTO)
          listado.limpiarFiltros()
        }}
        onActualizar={() => historial.refetch()}
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
          etiqueta="Buscar por quién entró"
          placeholder="Nombre o correo"
          valor={filtros.search}
          onChange={(valor) => listado.setFiltro('search', valor)}
        />
        <FiltroSelect
          icono={ActivityIcon}
          etiqueta="Filtrar por estado"
          valor={filtros.status || TODAS}
          onChange={(valor) => listado.setFiltro('status', valor === TODAS ? '' : valor)}
          opciones={ESTADOS}
        />
        {credenciales && credenciales.length > 0 && (
          <FiltroSelect
            icono={KeyRoundIcon}
            etiqueta="Filtrar por credencial"
            className="max-w-56"
            valor={filtros.credential || TODAS}
            onChange={(valor) =>
              listado.setFiltro('credential', valor === TODAS ? '' : valor)
            }
            opciones={[
              { valor: TODAS, etiqueta: 'Credenciales' },
              ...credenciales.map((una) => ({ valor: una.id, etiqueta: una.username })),
            ]}
          />
        )}
      </FilterBar>

      <DataTable
        columnas={columnas}
        datos={historial.data?.results ?? []}
        getKey={(sesion) => sesion.id}
        vista="tabla"
        cargando={historial.isPending}
        error={historial.error}
        onReintentar={() => historial.refetch()}
        // Vacío distinto sin datos que sin resultados del filtro
        vacio={
          listado.hayFiltros
            ? 'Ninguna sesión coincide con ese filtro.'
            : 'Nadie ha abierto la terminal todavía.'
        }
        filasEsperadas={Math.min(total, porPagina)}
      />

      <Pagination
        pagina={pagina}
        total={historial.data?.count ?? 0}
        porPagina={porPagina}
        etiqueta="sesiones"
        onCambiar={setPagina}
      />
    </div>
  )
}
