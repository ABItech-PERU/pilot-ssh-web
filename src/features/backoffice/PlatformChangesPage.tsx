import { useMutation, useQuery } from '@tanstack/react-query'
import {
  EyeIcon,
  FileSpreadsheetIcon,
  HistoryIcon,
  Loader2Icon,
  SearchXIcon,
  TagIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ColumnasMenu } from '@/components/columns-menu'
import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { EmptyState, PageHeader } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { listarCampos, partirTitulo } from '@/features/backoffice/cambios'
import { StaffActionPanel } from '@/features/backoffice/StaffActionPanel'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import {
  FechaCelda,
  FiltroDePeriodo,
  usePeriodoDeListado,
} from '@/features/credits/partes'
import { toApiError } from '@/lib/api-error'
import { descargarArchivo, nombreDeArchivo } from '@/lib/download'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { AuditEntry } from '@/types/api'

const TITULO = 'Historial de precios'
const DESCRIPCION = 'Cómo fueron cambiando los precios y los paquetes.'
const NADA = <span className="text-muted-foreground">—</span>

/** El catálogo se sobrescribe al guardar; aquí queda el valor anterior,
 *  quién lo cambió y cuándo. Exportable. */
export function PlatformChangesPage() {
  const { user } = useSession()

  if (!llevaFinanzas(user))
    return (
      <SinPermiso
        titulo={TITULO}
        descripcion={DESCRIPCION}
        permiso="can_manage_finances"
      />
    )

  return <Historial />
}

function Historial() {
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', kind: '', actor: '', from: '', to: '' },
    modulo: 'plataforma-historial',
    vistaPorDefecto: 'tabla',
    avanzados: ['actor', 'from', 'to'],
  })
  const [detalle, setDetalle] = useState<AuditEntry | null>(null)
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado

  const cambios = useQuery({
    queryKey: platformApi.clavesPlataforma.cambios(pagina, porPagina, listado.parametros),
    queryFn: () => platformApi.fetchChanges(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const exportar = useMutation({
    mutationFn: () => platformApi.exportChanges(listado.parametros),
    onSuccess: (archivo) => {
      descargarArchivo(archivo, nombreDeArchivo('Historial de precios', ''))
      toast.success('Historial de precios exportado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const tipos = [
    { valor: TODOS, etiqueta: 'Todos los tipos' },
    ...(cambios.data?.categories ?? []).map((tipo) => ({
      valor: tipo.value,
      etiqueta: tipo.label,
    })),
  ]

  const columnas: Columna<AuditEntry>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'created_at',
      header: 'Cuándo',
      prioridad: 1,
      ancho: '16%',
      cell: (entrada) => <FechaCelda iso={entrada.created_at} />,
    },
    {
      key: 'description',
      header: 'Qué cambió',
      prioridad: 2,
      ancho: '46%',
      cell: (entrada) => (
        <span className="min-w-0">
          <span className="block truncate text-sm">
            {partirTitulo(entrada).accion}{' '}
            <span className="font-semibold">{partirTitulo(entrada).nombre}</span>
          </span>
          {listarCampos(entrada) && (
            <span className="text-muted-foreground block truncate text-xs">
              {listarCampos(entrada)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Quién',
      prioridad: 3,
      ancho: '20%',
      cell: (entrada) =>
        entrada.actor ? (
          <span className="min-w-0">
            <span className="block truncate text-sm">{entrada.actor}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {entrada.actor_email}
            </span>
          </span>
        ) : (
          NADA
        ),
    },
    {
      key: 'device',
      header: 'Desde',
      porDefecto: false,
      prioridad: 8,
      ancho: '18%',
      cell: (entrada) => entrada.device || NADA,
    },
    {
      key: 'ip_address',
      header: 'IP',
      porDefecto: false,
      prioridad: 9,
      ancho: '12%',
      cell: (entrada) => (
        <span className="font-machine text-xs">{entrada.ip_address || '—'}</span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      fija: true,
      rol: 'acciones',
      alineacion: 'centro',
      acciones: 1,
      prioridad: 0,
      ancho: '9%',
      cell: (entrada) => (
        /* Solo ver: un menú de tres puntos con un único ítem sobra */
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ver detalle del cambio de ${entrada.actor ?? 'la plataforma'}`}
              onClick={() => setDetalle(entrada)}
            >
              <EyeIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ver detalle</TooltipContent>
        </Tooltip>
      ),
    },
  ]
  const eleccion = useColumnas('plataforma-historial', columnas)

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          <Button
            variant="outline"
            disabled={exportar.isPending || !cambios.data?.count}
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
          cargando={cambios.isFetching}
          onLimpiar={() => periodo.limpiar()}
          onActualizar={() => cambios.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Buscar por paquete o persona"
              etiqueta="Buscar cambios"
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
              <div className="space-y-1.5">
                <Label className="text-xs">Quién lo hizo</Label>
                <FiltroSelect
                  icono={UserIcon}
                  className="w-full"
                  etiqueta="Quién lo hizo"
                  valor={filtros.actor || TODOS}
                  onChange={(valor) => setFiltro('actor', valor === TODOS ? '' : valor)}
                  opciones={[
                    { valor: TODOS, etiqueta: 'Cualquiera' },
                    ...(cambios.data?.people ?? []).map((persona) => ({
                      valor: persona.value,
                      etiqueta: persona.label,
                    })),
                  ]}
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
            icono={TagIcon}
            etiqueta="Tipo de cambio"
            valor={filtros.kind || TODOS}
            onChange={(valor) => setFiltro('kind', valor === TODOS ? '' : valor)}
            opciones={tipos}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={cambios.data?.results ?? []}
          getKey={(entrada) => entrada.id}
          vista="tabla"
          cargando={cambios.isPending}
          error={cambios.error}
          onReintentar={() => cambios.refetch()}
          filasEsperadas={Math.min(porPagina, cambios.data?.results.length || 5)}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nada con esos filtros"
                description="Pruebe con otro tipo, otra persona u otro periodo."
              />
            ) : (
              <EmptyState
                icon={HistoryIcon}
                title="Sin cambios todavía"
                description="Aquí queda lo que se cambie en los precios y en los paquetes."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={cambios.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="cambios"
          onCambiar={setPagina}
        />
      </div>

      <StaffActionPanel
        cambio={detalle}
        titulo="Detalle del cambio"
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
      />
    </div>
  )
}
