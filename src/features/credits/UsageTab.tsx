import { useQuery } from '@tanstack/react-query'
import {
  ActivityIcon,
  CalendarCheckIcon,
  CoinsIcon,
  ServerIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'

import { Bloque } from '@/components/bloque'
import { DataTable, type Columna } from '@/components/data-table'
import { FilterBar, PageSizeSelect } from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import * as creditsApi from '@/features/credits/api'
import type { ContextoDeCreditos } from '@/features/credits/CreditsPage'
import {
  Cifra,
  FiltroDePeriodo,
  resolverPeriodoDeCreditos,
  usePeriodoDeListado,
  type PeriodoDeCreditos,
} from '@/features/credits/partes'
import { Barras } from '@/features/credits/UsageChart'
import { construirSerieDelRango, contar } from '@/features/credits/uso'
import { formatCredits, formatDay } from '@/lib/format'
import { useListado } from '@/lib/use-listado'
import type { DailyUsage } from '@/types/api'

/** Este mes de partida: responde «cómo vamos». */
const PERIODO_DE_PARTIDA: PeriodoDeCreditos = 'mes'
const RANGO_DE_PARTIDA = resolverPeriodoDeCreditos(PERIODO_DE_PARTIDA) ?? {
  from: '',
  to: '',
}

/** Coste del periodo, día más caro y detalle diario. Aparte de los
 *  movimientos: responde «en qué se va», no «qué entró y salió». */
export function UsageTab() {
  const { slug, saldo } = useOutletContext<ContextoDeCreditos>()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { from: RANGO_DE_PARTIDA.from, to: RANGO_DE_PARTIDA.to },
    modulo: 'uso',
    vistaPorDefecto: 'tabla',
  })
  const periodo = usePeriodoDeListado(listado, PERIODO_DE_PARTIDA)
  const { pagina, setPagina } = listado
  const rango = periodo.rango

  const resumen = useQuery({
    queryKey: creditsApi.clavesCreditos.resumenDeUso(slug, rango),
    queryFn: () => creditsApi.fetchUsageSummary(slug, rango),
    placeholderData: (anterior) => anterior,
  })
  const dias = useQuery({
    queryKey: creditsApi.clavesCreditos.usoDelPeriodo(slug, rango, pagina, porPagina),
    queryFn: () => creditsApi.fetchUsageOfPeriod(slug, rango, pagina, porPagina),
    placeholderData: (anterior) => anterior,
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const datos = resumen.data
  const serie =
    datos && saldo
      ? construirSerieDelRango(datos.series, rango, new Date(), saldo.billing_time_zone)
      : undefined
  // Pasados tres meses, las barras son meses y el rótulo lo dice
  const porMes = serie?.barras[0]?.clave.length === 7

  const columnas: Columna<DailyUsage>[] = [
    {
      key: 'dia',
      header: 'Día',
      rol: 'titulo',
      ancho: '28%',
      cell: (dia) => <span className="font-medium">{formatDay(dia.usage_date)}</span>,
    },
    {
      key: 'personas',
      header: 'Personas',
      ancho: '24%',
      cell: (dia) => (
        <Recuento usados={dia.members_used} cobrados={dia.members_billed} que="cobrada" />
      ),
    },
    {
      key: 'servidores',
      header: 'Servidores',
      ancho: '24%',
      cell: (dia) => (
        <Recuento usados={dia.servers_used} cobrados={dia.servers_billed} que="cobrado" />
      ),
    },
    {
      key: 'creditos',
      header: 'Créditos',
      alineacion: 'derecha',
      ancho: '24%',
      cell: (dia) => {
        const creditos = Number(dia.credits_charged)
        return creditos > 0 ? (
          <span className="font-medium tabular-nums">{formatCredits(creditos)}</span>
        ) : (
          <span className="text-muted-foreground">Gratis</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={resumen.isFetching || dias.isFetching}
        onLimpiar={periodo.limpiar}
        onActualizar={() => {
          void resumen.refetch()
          void dias.refetch()
        }}
        derecha={<PageSizeSelect valor={porPagina} onChange={cambiarTamano} />}
      >
        <FiltroDePeriodo
          periodo={periodo.periodo}
          rango={periodo.rango}
          onChange={periodo.cambiar}
        />
      </FilterBar>

      {resumen.isError ? (
        <ErrorState error={resumen.error} onRetry={() => resumen.refetch()} />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cifra
              icono={CoinsIcon}
              etiqueta="Créditos cobrados"
              valor={datos && formatCredits(datos.credits)}
              pie={
                datos &&
                (datos.peak && Number(datos.peak.credits_charged) > 0
                  ? `El día más caro, el ${formatDay(datos.peak.usage_date)}: ${formatCredits(datos.peak.credits_charged)}.`
                  : 'Nada cobrado en el periodo.')
              }
            />
            <Cifra
              icono={CalendarCheckIcon}
              etiqueta="Días con uso"
              valor={datos && String(datos.days_used)}
              unidad=""
              pie="Con alguna terminal abierta."
            />
            <Cifra
              icono={UsersIcon}
              etiqueta="Personas al día"
              valor={datos && formatCredits(datos.members_avg)}
              unidad=""
              pie={
                datos &&
                `${contar(datos.members_billed, 'cobrada', 'cobradas')} en el periodo.`
              }
            />
            <Cifra
              icono={ServerIcon}
              etiqueta="Servidores al día"
              valor={datos && formatCredits(datos.servers_avg)}
              unidad=""
              pie={
                datos &&
                `${contar(datos.servers_billed, 'cobrado', 'cobrados')} en el periodo.`
              }
            />
          </dl>

          <Bloque titulo={porMes ? 'Créditos por mes' : 'Créditos por día'}>
            <div className="p-4">
              {serie ? <Barras serie={serie} /> : <Skeleton className="h-36 w-full" />}
            </div>
          </Bloque>
        </>
      )}

      <Bloque titulo="Detalle por día">
        <DataTable
          columnas={columnas}
          datos={dias.data?.results ?? []}
          getKey={(dia) => dia.usage_date}
          vista="tabla"
          cargando={dias.isPending}
          error={dias.error}
          onReintentar={() => dias.refetch()}
          filasEsperadas={Math.min(porPagina, dias.data?.results.length || 5)}
          vacio={
            <EmptyState
              icon={ActivityIcon}
              title="Sin uso en el periodo"
              description="Los días en que alguien abre una terminal aparecen aquí."
            />
          }
        />
      </Bloque>

      <Pagination
        pagina={pagina}
        total={dias.data?.count ?? 0}
        porPagina={porPagina}
        etiqueta="días"
        onCambiar={setPagina}
      />
    </div>
  )
}

/** «3 · 2 cobradas»: cuántos hubo y cuántos costaron. */
function Recuento({
  usados,
  cobrados,
  que,
}: {
  usados: number
  cobrados: number
  que: string
}) {
  return (
    <span className="tabular-nums">
      {usados}
      <span className="text-muted-foreground">
        {' '}
        · {cobrados} {cobrados === 1 ? que : `${que}s`}
      </span>
    </span>
  )
}
