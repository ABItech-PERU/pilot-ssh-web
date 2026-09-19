import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CrownIcon, EyeIcon, SearchXIcon, ShieldIcon, UsersIcon } from 'lucide-react'
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
import { RowActions } from '@/components/row-actions'
import { EmptyState } from '@/components/states'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useSession } from '@/features/auth/session'
import { AccountPanel } from '@/features/backoffice/AccountPanel'
import { AccountSecurity } from '@/features/backoffice/AccountSecurity'
import * as platformApi from '@/features/backoffice/api'
import { useCaso } from '@/features/backoffice/caso'
import { atiende } from '@/features/backoffice/permisos'
import { PersonIdentity } from '@/features/backoffice/PersonIdentity'
import { ReasonDialog } from '@/features/backoffice/ReasonDialog'
import { FechaCelda } from '@/features/credits/partes'
import { toApiError } from '@/lib/api-error'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useListado } from '@/lib/use-listado'
import type { PlatformMember } from '@/types/api'

const ROLES = [
  { valor: TODOS, etiqueta: 'Todos los roles' },
  { valor: 'owner', etiqueta: 'Propietarios' },
  { valor: 'admin', etiqueta: 'Administradores' },
  { valor: 'member', etiqueta: 'Miembros' },
]

/** Equipo y seguridad de cada cuenta. Abre la cuenta de una persona y, si
 *  nadie gestiona la organización, nombra propietario a alguien. */
export function CaseTeamTab() {
  const organizacion = useCaso()
  const { user } = useSession()
  const cliente = useQueryClient()
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', role: '' },
    modulo: 'plataforma-caso-equipo',
    vistaPorDefecto: 'tabla',
  })
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [cuentaAbierta, setCuentaAbierta] = useState<string | null>(null)
  const [nombrando, setNombrando] = useState<PlatformMember | null>(null)
  const quienAtiende = atiende(user)

  const equipo = useQuery({
    queryKey: platformApi.clavesPlataforma.equipo(
      organizacion.slug,
      pagina,
      porPagina,
      listado.parametros,
    ),
    queryFn: () =>
      platformApi.fetchOrganizationMembers(
        organizacion.slug,
        pagina,
        porPagina,
        listado.parametros,
      ),
    placeholderData: (anterior) => anterior,
  })

  const nombrar = useMutation({
    mutationFn: ({ membresia, motivo }: { membresia: string; motivo: string }) =>
      platformApi.recoverOwnership(organizacion.slug, membresia, motivo),
    onSuccess: async (miembro) => {
      await platformApi.invalidarPlataforma(cliente)
      setNombrando(null)
      toast.success(`${miembro.user.display_name} es ahora propietario.`)
    },
  })

  const columnas: Columna<PlatformMember>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'persona',
      header: 'Persona',
      rol: 'titulo',
      ancho: '38%',
      lineas: 2,
      cell: (miembro) => <PersonIdentity persona={miembro.user} />,
    },
    {
      key: 'rol',
      header: 'Rol',
      ancho: '16%',
      cell: (miembro) => miembro.role_label,
    },
    {
      key: 'cuenta',
      header: 'Cuenta',
      ancho: '20%',
      lineas: 2,
      cell: (miembro) => <AccountSecurity persona={miembro.user} />,
    },
    {
      key: 'desde',
      header: 'En el equipo desde',
      desde: 'lg',
      ancho: '16%',
      lineas: 2,
      cell: (miembro) => <FechaCelda iso={miembro.created_at} />,
    },
  ]

  // Ver una cuenta es de quien atiende; si no, la fila no tiene acciones
  if (quienAtiende) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      acciones: 2,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (miembro) => (
        <RowActions
          etiqueta={`de ${miembro.user.display_name}`}
          onVerDetalle={() => setCuentaAbierta(miembro.user.id)}
        >
          <DropdownMenuItem onSelect={() => setCuentaAbierta(miembro.user.id)}>
            <EyeIcon className="size-4" />
            Ver su cuenta
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={organizacion.is_own || miembro.role === 'owner'}
            onSelect={() => setNombrando(miembro)}
          >
            <CrownIcon className="size-4" />
            Nombrar propietario
          </DropdownMenuItem>
        </RowActions>
      ),
    })
  }

  return (
    <div className="space-y-4">
      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={equipo.isFetching}
        onLimpiar={listado.limpiarFiltros}
        onActualizar={() => equipo.refetch()}
        busqueda={
          <SearchInput
            valor={filtros.search}
            onChange={(valor) => setFiltro('search', valor)}
            placeholder="Buscar por nombre o correo"
            etiqueta="Buscar en el equipo"
          />
        }
        derecha={
          <PageSizeSelect
            valor={porPagina}
            onChange={(tamano) => {
              setPorPagina(tamano)
              setPagina(1)
            }}
          />
        }
      >
        <FiltroSelect
          icono={ShieldIcon}
          etiqueta="Rol en la organización"
          valor={filtros.role || TODOS}
          onChange={(valor) => setFiltro('role', valor === TODOS ? '' : valor)}
          opciones={ROLES}
        />
      </FilterBar>

      <DataTable
        columnas={columnas}
        datos={equipo.data?.results ?? []}
        getKey={(miembro) => miembro.id}
        vista="tabla"
        cargando={equipo.isPending}
        error={equipo.error}
        onReintentar={() => equipo.refetch()}
        filasEsperadas={Math.min(porPagina, organizacion.members_count || 3)}
        vacio={
          listado.hayFiltros ? (
            <EmptyState
              icon={SearchXIcon}
              title="Nadie con esa búsqueda"
              description="Pruebe con otro nombre o correo."
            />
          ) : (
            <EmptyState
              icon={UsersIcon}
              title="Sin nadie en el equipo"
              description="La organización se quedó sin miembros."
            />
          )
        }
      />

      <Pagination
        pagina={pagina}
        total={equipo.data?.count ?? 0}
        porPagina={porPagina}
        etiqueta="personas"
        onCambiar={setPagina}
      />

      <AccountPanel
        cuentaId={cuentaAbierta}
        open={cuentaAbierta !== null}
        onOpenChange={(abierto) => !abierto && setCuentaAbierta(null)}
      />

      <ReasonDialog
        open={nombrando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setNombrando(null)
            nombrar.reset()
          }
        }}
        titulo={`¿Nombrar propietario a ${nombrando?.user.display_name ?? ''}?`}
        descripcion="Nadie pierde su rol. Se avisa a todos los que administran la organización."
        pista="Diga quién lo pidió y cómo lo comprobó. Lo leen en su auditoría."
        accion="Nombrar propietario"
        pendiente={nombrar.isPending}
        error={nombrar.error ? toApiError(nombrar.error) : null}
        onConfirmar={(motivo) =>
          nombrando && nombrar.mutate({ membresia: nombrando.id, motivo })
        }
      />
    </div>
  )
}
