import { useQuery } from '@tanstack/react-query'
import {
  CircleDotIcon,
  CreditCardIcon,
  PhoneIcon,
  ExternalLinkIcon,
  PackageIcon,
  SearchXIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'

import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import { FilterBar, FiltroSelect, PageSizeSelect } from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import * as creditsApi from '@/features/credits/api'
import type { ContextoDeCreditos } from '@/features/credits/CreditsPage'
import {
  EstadoBadge,
  FechaCelda,
  FiltroDePeriodo,
  usePeriodoDeListado,
} from '@/features/credits/partes'
import { describirRecarga, ESTADOS_DE_RECARGA } from '@/features/credits/recargas'
import { TopUpDetailPanel } from '@/features/credits/TopUpDetailPanel'
import { formatCredits, formatPrice } from '@/lib/format'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useListado } from '@/lib/use-listado'
import type { TopUpRequest } from '@/types/api'

const ESTADOS = [{ valor: TODOS, etiqueta: 'Todos los estados' }, ...ESTADOS_DE_RECARGA]

/** Todas las recargas, acreditadas y canceladas incluidas: el historial
 *  de pagos. */
export function TopUpsTab() {
  const { slug, saldo, continuarPago } = useOutletContext<ContextoDeCreditos>()
  const enLinea = saldo?.online_payment ?? true
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { status: '', from: '', to: '' },
    modulo: 'recargas',
    vistaPorDefecto: 'tabla',
  })
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [detalle, setDetalle] = useState<TopUpRequest | null>(null)

  const recargas = useQuery({
    queryKey: creditsApi.clavesCreditos.recargasFiltradas(
      slug,
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => creditsApi.fetchTopUps(slug, pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const columnas: Columna<TopUpRequest>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'fecha',
      header: 'Pedida',
      ancho: '17%',
      lineas: 2,
      cell: (solicitud) => <FechaCelda iso={solicitud.created_at} />,
    },
    {
      key: 'paquete',
      header: 'Paquete',
      rol: 'titulo',
      ancho: '20%',
      lineas: 2,
      cell: (solicitud) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{solicitud.package_name}</span>
          {solicitud.requested_by && (
            <span className="text-muted-foreground block truncate text-xs">
              Por {solicitud.requested_by}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'importe',
      header: 'Importe',
      alineacion: 'derecha',
      ancho: '9%',
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
      ancho: '9%',
      cell: (solicitud) => (
        <span className="tabular-nums">{formatCredits(solicitud.credits)}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      ancho: '20%',
      cell: (solicitud) => {
        const estado = describirRecarga(solicitud, enLinea)
        return <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
      },
    },
    {
      // Un botón por fila, según el estado: pagar, ver el código del
      // agente o abrir la ficha
      key: 'accion',
      header: 'Acciones',
      rol: 'acciones',
      acciones: 1,
      alineacion: 'centro',
      // Ancho fijo, el de «Continuar el pago»: en porcentaje crecería en
      // pantallas grandes
      ancho: '11rem',
      cell: (solicitud) => {
        const { accion } = describirRecarga(solicitud, enLinea)
        if (accion === 'pagar') {
          return (
            <Button size="sm" onClick={() => continuarPago(solicitud)}>
              <CreditCardIcon />
              Continuar el pago
            </Button>
          )
        }
        if (accion === 'contacto') {
          return (
            <Button variant="outline" size="sm" onClick={() => continuarPago(solicitud)}>
              <PhoneIcon />
              Revisar el contacto
            </Button>
          )
        }
        if (accion === 'codigo') {
          return (
            <Button asChild size="sm">
              <a href={solicitud.voucher_url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Ver el código
              </a>
            </Button>
          )
        }
        return (
          <Button variant="outline" size="sm" onClick={() => setDetalle(solicitud)}>
            Ver detalle
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={recargas.isFetching}
        onLimpiar={periodo.limpiar}
        onActualizar={() => recargas.refetch()}
        derecha={<PageSizeSelect valor={porPagina} onChange={cambiarTamano} />}
      >
        <FiltroSelect
          icono={CircleDotIcon}
          etiqueta="Estado de la recarga"
          valor={filtros.status || TODOS}
          onChange={(valor) => setFiltro('status', valor === TODOS ? '' : valor)}
          opciones={ESTADOS}
        />
        <FiltroDePeriodo
          periodo={periodo.periodo}
          rango={periodo.rango}
          onChange={periodo.cambiar}
        />
      </FilterBar>

      <DataTable
        columnas={columnas}
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
              description="Pruebe con otro estado o periodo, o límpielos."
            />
          ) : (
            <EmptyState
              icon={PackageIcon}
              title="Sin recargas"
              description="La primera se pide con «Recargar créditos», arriba."
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

      <TopUpDetailPanel
        solicitud={detalle}
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
        onPagar={() => {
          if (detalle) continuarPago(detalle)
          setDetalle(null)
        }}
      />
    </div>
  )
}
