import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ActivityIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SearchXIcon,
  TagIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
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
import { tituloDelCambio } from '@/features/backoffice/cambios'
import {
  OrganizacionElegida,
  useOrganizacionDeUrl,
} from '@/features/backoffice/OrganizationFilter'
import { llevaPersonal } from '@/features/backoffice/permisos'
import { buildCasePath } from '@/features/backoffice/rutas'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import { StaffActionPanel } from '@/features/backoffice/StaffActionPanel'
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
import type { StaffActivityEntry } from '@/types/api'

const TITULO = 'Actividad del personal'
const DESCRIPCION = 'Lo que hizo el personal, en todas las organizaciones.'
const NADA = <span className="text-muted-foreground">—</span>

/** Acciones del personal a la vista del propio personal, no solo del
 *  cliente afectado. */
export function PlatformActivityPage() {
  const { user } = useSession()

  if (!llevaPersonal(user))
    return (
      <SinPermiso titulo={TITULO} descripcion={DESCRIPCION} permiso="can_manage_staff" />
    )

  return <Actividad />
}

function Actividad() {
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: {
      search: '',
      category: '',
      actor: '',
      organization: '',
      from: '',
      to: '',
    },
    modulo: 'plataforma-actividad',
    vistaPorDefecto: 'tabla',
    avanzados: ['actor', 'organization', 'from', 'to'],
  })
  const [detalle, setDetalle] = useState<StaffActivityEntry | null>(null)
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado
  const organizacionDeUrl = useOrganizacionDeUrl(setFiltro)

  const actividad = useQuery({
    queryKey: platformApi.clavesPlataforma.actividad(
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => platformApi.fetchActivity(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const exportar = useMutation({
    mutationFn: () => platformApi.exportActivity(listado.parametros),
    onSuccess: (archivo) => {
      descargarArchivo(
        archivo,
        nombreDeArchivo(TITULO, filtros.organization || 'Plataforma'),
      )
      toast.success('Actividad del personal exportada.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const columnas: Columna<StaffActivityEntry>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'created_at',
      header: 'Cuándo',
      prioridad: 1,
      ancho: '15%',
      lineas: 2,
      cell: (entrada) => <FechaCelda iso={entrada.created_at} />,
    },
    {
      key: 'description',
      header: 'Qué hizo',
      rol: 'titulo',
      fija: true,
      ancho: '36%',
      lineas: 2,
      cell: (entrada) => (
        // En móvil se dobla: una frase larga ensancharía la página
        <span className="block min-w-0">
          <span className="block text-sm break-words sm:truncate">
            {tituloDelCambio(entrada)}
          </span>
          {entrada.detail && (
            <span className="text-muted-foreground block text-xs break-words sm:truncate">
              {entrada.detail}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'organization',
      header: 'Organización',
      prioridad: 2,
      ancho: '18%',
      cell: (entrada) =>
        entrada.organization ? (
          <Link
            to={buildCasePath(entrada.organization.slug)}
            className="block truncate text-sm hover:underline"
          >
            {entrada.organization.name}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">Plataforma</span>
        ),
    },
    {
      key: 'actor',
      header: 'Quién',
      prioridad: 3,
      ancho: '18%',
      lineas: 2,
      cell: (entrada) =>
        entrada.actor ? (
          <span className="block min-w-0">
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
      header: 'Equipo',
      porDefecto: false,
      prioridad: 8,
      ancho: '16%',
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
      ancho: '8%',
      cell: (entrada) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ver detalle de la acción de ${entrada.actor ?? 'la plataforma'}`}
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
  const eleccion = useColumnas('plataforma-actividad', columnas)

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          <Button
            variant="outline"
            disabled={exportar.isPending || !actividad.data?.count}
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
          cargando={actividad.isFetching}
          onLimpiar={() => {
            organizacionDeUrl.quitar()
            periodo.limpiar()
          }}
          onActualizar={() => actividad.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Buscar por persona, motivo o nombre"
              etiqueta="Buscar en la actividad"
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
                <Label className="text-xs">Quién lo hizo</Label>
                <FiltroSelect
                  icono={UserIcon}
                  className="w-full"
                  etiqueta="Quién lo hizo"
                  valor={filtros.actor || TODOS}
                  onChange={(valor) => setFiltro('actor', valor === TODOS ? '' : valor)}
                  opciones={[
                    { valor: TODOS, etiqueta: 'Cualquiera' },
                    ...(actividad.data?.people ?? []).map((persona) => ({
                      valor: persona.value,
                      etiqueta: persona.label,
                    })),
                  ]}
                />
              </div>
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
            etiqueta="Tipo de acción"
            valor={filtros.category || TODOS}
            onChange={(valor) => setFiltro('category', valor === TODOS ? '' : valor)}
            opciones={[
              { valor: TODOS, etiqueta: 'Todos los tipos' },
              ...(actividad.data?.categories ?? []).map((tipo) => ({
                valor: tipo.value,
                etiqueta: tipo.label,
              })),
            ]}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={actividad.data?.results ?? []}
          getKey={(entrada) => entrada.id}
          vista="tabla"
          cargando={actividad.isPending}
          error={actividad.error}
          onReintentar={() => actividad.refetch()}
          filasEsperadas={Math.min(
            porPagina,
            actividad.data?.results.length || porPagina,
          )}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nada con esos filtros"
                description="Pruebe con otro tipo, otra persona u otro periodo."
              />
            ) : (
              <EmptyState
                icon={ActivityIcon}
                title="Sin actividad todavía"
                description="Aquí queda cada acción del personal sobre la plataforma."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={actividad.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="acciones"
          onCambiar={setPagina}
        />
      </div>

      <StaffActionPanel
        cambio={detalle}
        titulo="Detalle de la acción"
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
      />
    </div>
  )
}
