import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  EyeIcon,
  KeyRoundIcon,
  SearchXIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserCogIcon,
  UserMinusIcon,
  UserPlusIcon,
} from 'lucide-react'
import { useState } from 'react'
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
import { EmptyState, PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { llevaPersonal, PERMISOS } from '@/features/backoffice/permisos'
import { PersonIdentity } from '@/features/backoffice/PersonIdentity'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import { StaffDialog } from '@/features/backoffice/StaffDialog'
import { StaffPanel } from '@/features/backoffice/StaffPanel'
import { FechaCelda } from '@/features/credits/partes'
import { toApiError } from '@/lib/api-error'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { StaffMember } from '@/types/api'

const TITULO = 'Personal'
const DESCRIPCION = 'Quién trabaja en la plataforma y con qué permisos.'
const NADA = <span className="text-muted-foreground">—</span>

const PERMISOS_DEL_FILTRO = [
  { valor: TODOS, etiqueta: 'Todos los permisos' },
  ...PERMISOS.map((permiso) => ({ valor: permiso.filtro, etiqueta: permiso.nombre })),
]
const DOS_PASOS = [
  { valor: TODOS, etiqueta: 'Con y sin dos pasos' },
  { valor: 'true', etiqueta: 'Con dos pasos' },
  { valor: 'false', etiqueta: 'Sin dos pasos' },
]

/** Personal puede darse todo lo demás: nadie cambia los suyos, y cada
 *  cambio se avisa a quien lo recibe. */
export function PlatformStaffPage() {
  const { user } = useSession()

  if (!llevaPersonal(user))
    return (
      <SinPermiso titulo={TITULO} descripcion={DESCRIPCION} permiso="can_manage_staff" />
    )

  return <Personal />
}

function Personal() {
  const { user } = useSession()
  const cliente = useQueryClient()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', capability: '', two_factor: '' },
    modulo: 'plataforma-personal',
    vistaPorDefecto: 'tabla',
    avanzados: ['two_factor'],
  })
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [ficha, setFicha] = useState<StaffMember | null>(null)
  const [editando, setEditando] = useState<StaffMember | null>(null)
  const [anadiendo, setAnadiendo] = useState(false)
  const [quitando, setQuitando] = useState<StaffMember | null>(null)

  const personal = useQuery({
    queryKey: platformApi.clavesPlataforma.personal(
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () => platformApi.fetchStaff(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const quitar = useMutation({
    mutationFn: (miembro: StaffMember) => platformApi.removeStaff(miembro.id),
    onSuccess: async (_, miembro) => {
      await cliente.invalidateQueries({
        queryKey: platformApi.clavesPlataforma.todoElPersonal(),
      })
      setQuitando(null)
      toast.success(`${miembro.display_name} ya no forma parte del personal.`)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const cambiarTamano = (tamano: number) => {
    setPorPagina(tamano)
    setPagina(1)
  }

  const columnas: Columna<StaffMember>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'persona',
      header: 'Persona',
      rol: 'titulo',
      fija: true,
      ancho: '30%',
      lineas: 2,
      cell: (miembro) => (
        <span className="flex min-w-0 items-center gap-2">
          <PersonIdentity persona={miembro} className="flex-1" />
          {miembro.id === user?.id && (
            <Badge variant="outline" className="shrink-0 font-normal">
              Usted
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'permisos',
      header: 'Permisos',
      ancho: '28%',
      prioridad: 1,
      cell: (miembro) => (
        <span className="flex flex-wrap gap-1.5">
          {PERMISOS.filter((permiso) => miembro[permiso.clave]).map(
            ({ clave, nombre, icono: Icono }) => (
              <Badge key={clave} variant="secondary" className="gap-1 font-normal">
                <Icono className="size-3" />
                {nombre}
              </Badge>
            ),
          )}
        </span>
      ),
    },
    {
      key: 'dos_pasos',
      header: 'Dos pasos',
      desde: 'md',
      ancho: '15%',
      lineas: 2,
      prioridad: 2,
      cell: (miembro) =>
        miembro.two_factor_enabled ? (
          <span className="text-success inline-flex items-center gap-1.5 text-sm">
            <ShieldCheckIcon className="size-4" />
            Activada
          </span>
        ) : (
          // Permisos que no puede usar: se destacan
          <span className="block text-sm">
            <span className="text-warning inline-flex items-center gap-1.5 font-medium">
              <ShieldAlertIcon className="size-4" />
              Sin activar
            </span>
            <span className="text-muted-foreground block text-xs">No entra al panel</span>
          </span>
        ),
    },
    {
      key: 'ultimo_uso',
      header: 'Último uso',
      desde: 'lg',
      ancho: '15%',
      lineas: 2,
      prioridad: 3,
      cell: (miembro) =>
        miembro.last_seen_at ? <FechaCelda iso={miembro.last_seen_at} /> : NADA,
    },
    {
      key: 'alta',
      header: 'Alta',
      porDefecto: false,
      ancho: '15%',
      lineas: 2,
      prioridad: 4,
      cell: (miembro) => <FechaCelda iso={miembro.date_joined} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 2,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (miembro) => {
        const propio = miembro.id === user?.id
        return (
          <RowActions
            etiqueta={`de ${miembro.display_name}`}
            onVerDetalle={() => setFicha(miembro)}
          >
            <DropdownMenuItem onSelect={() => setFicha(miembro)}>
              <EyeIcon className="size-4" />
              Ver detalle
            </DropdownMenuItem>
            {propio ? (
              <p className="text-muted-foreground px-2 py-1.5 text-xs">
                Sus permisos los cambia otra persona del personal.
              </p>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => setEditando(miembro)}>
                  <UserCogIcon className="size-4" />
                  Cambiar permisos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setQuitando(miembro)}
                >
                  <UserMinusIcon className="size-4" />
                  Quitar del personal
                </DropdownMenuItem>
              </>
            )}
          </RowActions>
        )
      },
    },
  ]
  const eleccion = useColumnas('plataforma-personal', columnas)

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          <Button onClick={() => setAnadiendo(true)}>
            <UserPlusIcon />
            Añadir al personal
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterBar
          hayFiltros={listado.hayFiltros}
          cargando={personal.isFetching}
          onLimpiar={listado.limpiarFiltros}
          onActualizar={() => personal.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Buscar por nombre o correo"
              etiqueta="Buscar en el personal"
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
            <div className="space-y-1.5">
              <Label className="text-xs">Dos pasos</Label>
              <FiltroSelect
                icono={ShieldIcon}
                etiqueta="Dos pasos"
                className="w-full"
                valor={filtros.two_factor || TODOS}
                onChange={(valor) =>
                  setFiltro('two_factor', valor === TODOS ? '' : valor)
                }
                opciones={DOS_PASOS}
              />
            </div>
          }
        >
          <FiltroSelect
            icono={KeyRoundIcon}
            etiqueta="Permiso"
            valor={filtros.capability || TODOS}
            onChange={(valor) => setFiltro('capability', valor === TODOS ? '' : valor)}
            opciones={PERMISOS_DEL_FILTRO}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={personal.data?.results ?? []}
          getKey={(miembro) => miembro.id}
          vista="tabla"
          cargando={personal.isPending}
          error={personal.error}
          onReintentar={() => personal.refetch()}
          filasEsperadas={Math.min(porPagina, personal.data?.results.length || 3)}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nadie con esos filtros"
                description="Pruebe con otro nombre, permiso o estado, o límpielos."
              />
            ) : (
              <EmptyState
                icon={UserCogIcon}
                title="Sin personal"
                description="Añada a quien trabaja en la plataforma."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={personal.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="personas"
          onCambiar={setPagina}
        />
      </div>

      <StaffPanel
        miembro={ficha}
        esPropio={ficha?.id === user?.id}
        open={ficha !== null}
        onOpenChange={(abierto) => !abierto && setFicha(null)}
        onCambiarPermisos={(miembro) => {
          setFicha(null)
          setEditando(miembro)
        }}
      />

      <StaffDialog
        miembro={editando}
        open={anadiendo || editando !== null}
        onOpenChange={(abierto) => {
          if (abierto) return
          setAnadiendo(false)
          setEditando(null)
        }}
      />

      <ConfirmDialog
        open={quitando !== null}
        onOpenChange={(abierto) => !abierto && setQuitando(null)}
        titulo={`¿Quitar a ${quitando?.display_name ?? ''} del personal?`}
        descripcion="Pierde todos sus permisos del panel. Su cuenta sigue siendo suya."
        accion="Quitar del personal"
        destructiva
        pendiente={quitar.isPending}
        onConfirmar={() => quitando && quitar.mutate(quitando)}
      />
    </div>
  )
}
