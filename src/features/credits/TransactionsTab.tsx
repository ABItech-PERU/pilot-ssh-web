import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRightIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  ReceiptIcon,
  SearchXIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { toast } from 'sonner'

import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import * as creditsApi from '@/features/credits/api'
import type { ContextoDeCreditos } from '@/features/credits/CreditsPage'
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
import { useCurrentOrganization } from '@/features/organizations/current'
import { toApiError } from '@/lib/api-error'
import { descargarArchivo, nombreDeArchivo } from '@/lib/download'
import { formatCredits } from '@/lib/format'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useListado } from '@/lib/use-listado'
import type { CreditTransaction } from '@/types/api'

const TIPOS = [{ valor: TODOS, etiqueta: 'Todos los tipos' }, ...TIPOS_DE_MOVIMIENTO]

/** Libro mayor con el saldo tras cada movimiento. Filtrado en el servidor
 *  y paginado: en un año son cientos de filas. */
export function TransactionsTab() {
  const { slug } = useOutletContext<ContextoDeCreditos>()
  const { organization } = useCurrentOrganization()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', kind: '', from: '', to: '' },
    modulo: 'movimientos',
    vistaPorDefecto: 'tabla',
  })
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado

  const movimientos = useQuery({
    queryKey: creditsApi.clavesCreditos.movimientos(
      slug,
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () =>
      creditsApi.fetchTransactions(slug, pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const exportar = useMutation({
    mutationFn: () => creditsApi.exportTransactions(slug, listado.parametros),
    onSuccess: (archivo) => {
      descargarArchivo(archivo, nombreDeArchivo('Movimientos', organization?.name ?? ''))
      toast.success('Movimientos exportados.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  // Vuelve a la primera página: la actual podría quedar vacía
  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const columnas: Columna<CreditTransaction>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'fecha',
      header: 'Fecha',
      ancho: '20%',
      lineas: 2,
      cell: (movimiento) => <FechaCelda iso={movimiento.created_at} />,
    },
    {
      key: 'concepto',
      header: 'Concepto',
      rol: 'titulo',
      ancho: '33%',
      lineas: 2,
      cell: (movimiento) => {
        const autor = autorDe(movimiento)
        return (
          <span className="block min-w-0">
            <span className="block truncate font-medium">{conceptoDe(movimiento)}</span>
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
      desde: 'md',
      ancho: '16%',
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
      ancho: '13%',
      cell: (movimiento) => <Importe cantidad={movimiento.amount} />,
    },
    {
      key: 'saldo',
      header: 'Saldo',
      alineacion: 'derecha',
      desde: 'md',
      ancho: '13%',
      cell: (movimiento) => (
        <span className="text-muted-foreground tabular-nums">
          {formatCredits(movimiento.balance_after)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={movimientos.isFetching}
        onLimpiar={periodo.limpiar}
        onActualizar={() => movimientos.refetch()}
        derecha={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-10! max-sm:w-10 max-sm:px-0"
              disabled={exportar.isPending || !movimientos.data?.count}
              onClick={() => exportar.mutate()}
            >
              {exportar.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <FileSpreadsheetIcon />
              )}
              <span className="max-sm:sr-only">Exportar a Excel</span>
            </Button>
            <PageSizeSelect valor={porPagina} onChange={cambiarTamano} />
          </>
        }
      >
        <SearchInput
          valor={filtros.search}
          onChange={(valor) => setFiltro('search', valor)}
          placeholder="Buscar por concepto"
          etiqueta="Buscar movimientos"
        />
        <FiltroSelect
          icono={ArrowLeftRightIcon}
          etiqueta="Tipo de movimiento"
          valor={filtros.kind || TODOS}
          onChange={(valor) => setFiltro('kind', valor === TODOS ? '' : valor)}
          opciones={TIPOS}
        />
        <FiltroDePeriodo
          periodo={periodo.periodo}
          rango={periodo.rango}
          onChange={periodo.cambiar}
        />
      </FilterBar>

      <DataTable
        columnas={columnas}
        datos={movimientos.data?.results ?? []}
        getKey={(movimiento) => movimiento.id}
        vista="tabla"
        cargando={movimientos.isPending}
        error={movimientos.error}
        onReintentar={() => movimientos.refetch()}
        filasEsperadas={Math.min(porPagina, movimientos.data?.results.length || 5)}
        vacio={
          listado.hayFiltros ? (
            <EmptyState
              icon={SearchXIcon}
              title="Nada con esos filtros"
              description="Pruebe con otro periodo o tipo, o límpielos."
            />
          ) : (
            <EmptyState
              icon={ReceiptIcon}
              title="Sin movimientos"
              description="Aquí aparecerán las recargas y el uso de cada día."
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
  )
}
