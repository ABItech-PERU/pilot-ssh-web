import { useQuery } from '@tanstack/react-query'
import { ArrowUpDownIcon, ShieldIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { useOutletContext } from 'react-router'

import { DataTable, type Columna } from '@/components/data-table'
import { FilterBar, FiltroSelect, SearchInput, ViewToggle } from '@/components/filter-bar'
import { EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as accessApi from '@/features/access/api'
import { NIVELES } from '@/features/access/levels'
import { useSession } from '@/features/auth/session'
import * as membersApi from '@/features/members/api'
import { MemberActions } from '@/features/members/MemberActions'
import { OutsiderGrants } from '@/features/access/OutsiderGrants'
import { PendingInvitations } from '@/features/members/PendingInvitations'
import { ROLES } from '@/features/members/roles'
import type { ContextoDelEquipo } from '@/features/members/TeamPage'
import { buildInitials, formatDateTime, formatRelative } from '@/lib/format'
import { useListado } from '@/lib/use-listado'
import type { AccessGrant, AccessGroup, Membership } from '@/types/api'

const ROLES_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos los roles' },
  { valor: 'owner', etiqueta: 'Propietario' },
  { valor: 'admin', etiqueta: 'Administrador' },
  { valor: 'member', etiqueta: 'Miembro' },
] as const

const ORDENES = [
  { valor: 'name', etiqueta: 'Nombre (A–Z)' },
  { valor: '-created_at', etiqueta: 'Últimos en entrar' },
  { valor: 'created_at', etiqueta: 'Primeros en entrar' },
] as const

/** Filtro de quien no entra a nada: descuido habitual al invitar. */
const SIN_ACCESO = 'sin-acceso'

/** Fuentes de acceso de una persona, en orden de lectura. */
interface AccesoDeLaPersona {
  /** Propietario o administrador: entra a todo sin concesión. */
  porRol: boolean
  toda: AccessGrant | null
  grupos: AccessGroup[]
  /** Servidores, credenciales o etiquetas concedidos a su nombre. */
  concretos: number
}

/** Miembros y su rol. Las invitaciones pendientes van en lista aparte: aún
 *  no son miembros. */
export function MembersTab() {
  const { slug, administra, onInvitar } = useOutletContext<ContextoDelEquipo>()
  const { user } = useSession()

  const listado = useListado({
    modulo: 'members',
    // Tabla: los roles se comparan de un vistazo
    vistaPorDefecto: 'tabla',
    filtrosIniciales: { search: '', role: 'todos', group: 'todos', ordering: 'name' },
  })

  // Grupo filtrado en el cliente: vive en `servers`, fuera del alcance de
  // `accounts`, y el equipo entero está en memoria sin paginar
  const { group: _grupo, ...delServidor } = listado.parametros
  const parametros = {
    ...delServidor,
    role: listado.parametros.role === 'todos' ? '' : (listado.parametros.role ?? ''),
  }

  const consulta = useQuery({
    queryKey: membersApi.clavesEquipo.miembros(slug, parametros),
    queryFn: () => membersApi.fetchMembers(slug!, parametros),
    enabled: Boolean(slug),
  })

  // Misma clave que la pestaña de grupos: sin petición de más
  const grupos = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(slug),
    queryFn: () => accessApi.fetchGroups(slug!),
    enabled: Boolean(slug),
  })

  const gruposDe = (membresia: string) =>
    (grupos.data ?? []).filter((grupo) =>
      grupo.members.some((miembro) => miembro.membership === membresia),
    )

  // Misma clave que las demás pantallas del equipo; da el acceso a toda la
  // organización concedido a la persona
  const concesiones = useQuery({
    queryKey: accessApi.clavesAcceso.concesiones(slug),
    queryFn: () => accessApi.fetchGrants(slug!),
    enabled: Boolean(slug),
  })

  const accesoDe = (miembro: Membership): AccesoDeLaPersona => {
    const suyas = (concesiones.data ?? []).filter(
      (concesion) =>
        concesion.subject_type === 'user' &&
        concesion.subject_email === miembro.email &&
        !concesion.is_expired,
    )
    return {
      porRol: miembro.role === 'owner' || miembro.role === 'admin',
      toda: suyas.find((concesion) => concesion.scope === 'organization') ?? null,
      grupos: gruposDe(miembro.id),
      concretos: suyas.filter((concesion) => concesion.scope !== 'organization').length,
    }
  }

  const elegido = listado.filtros.group
  const miembros = (consulta.data ?? []).filter((miembro) => {
    if (elegido === 'todos') return true
    if (elegido === SIN_ACCESO) return describirAcceso(accesoDe(miembro)).length === 0
    return gruposDe(miembro.id).some((grupo) => grupo.id === elegido)
  })

  const opcionesDeGrupo = [
    { valor: 'todos', etiqueta: 'Todos los grupos' },
    { valor: SIN_ACCESO, etiqueta: 'Sin acceso' },
    ...(grupos.data ?? []).map((grupo) => ({
      valor: grupo.id,
      etiqueta: grupo.name,
    })),
  ]

  const columnas: Columna<Membership>[] = [
    {
      key: 'persona',
      header: 'Persona',
      rol: 'titulo',
      lineas: 2,
      // El nombre se lleva el espacio sobrante; sin ancho, las columnas
      // saldrían iguales
      ancho: '38%',
      cell: (fila) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8 shrink-0">
            {fila.avatar_url && <AvatarImage src={fila.avatar_url} alt="" />}
            <AvatarFallback className="text-xs font-semibold">
              {buildInitials(fila.display_name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {fila.display_name}
              {fila.user === user?.id && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  Usted
                </Badge>
              )}
            </span>
            <span className="text-muted-foreground font-machine block truncate text-xs">
              {fila.email}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'rol',
      header: 'Rol en la organización',
      desde: 'md',
      ancho: '18%',
      cell: (fila) => {
        const { etiqueta, alcance, icono: Icono } = ROLES[fila.role]
        return (
          <span className="inline-flex items-center gap-1.5" title={alcance}>
            <Icono className="text-muted-foreground size-4 shrink-0" />
            {etiqueta}
          </span>
        )
      },
    },
    {
      key: 'acceso',
      header: 'Acceso',
      desde: 'lg',
      ancho: '24%',
      cell: (fila) => {
        const fichas = describirAcceso(accesoDe(fila))
        if (fichas.length === 0) {
          return <span className="text-muted-foreground">Sin acceso</span>
        }
        return (
          <span className="flex flex-wrap gap-1">
            {fichas.slice(0, 2).map((ficha) => (
              <Badge key={ficha} variant="secondary" className="font-normal">
                {ficha}
              </Badge>
            ))}
            {fichas.length > 2 && <Badge variant="outline">+{fichas.length - 2}</Badge>}
          </span>
        )
      },
    },
    {
      key: 'alta',
      header: 'Se unió',
      desde: 'xl',
      ancho: '14%',
      cell: (fila) => (
        <span className="text-muted-foreground" title={formatDateTime(fila.created_at)}>
          {formatRelative(fila.created_at)}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      rol: 'acciones',
      alineacion: 'derecha',
      acciones: 1,
      ancho: '96px',
      cell: (fila) =>
        administra && slug ? (
          <MemberActions slug={slug} miembro={fila} esUsted={fila.user === user?.id} />
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Rol y acceso son distintos: evita leerlos como contradictorios */}
      <p className="text-muted-foreground text-sm">
        El rol dice qué gestiona. La columna Acceso, a qué entra.
      </p>

      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={consulta.isFetching}
        onLimpiar={listado.limpiarFiltros}
        onActualizar={() => consulta.refetch()}
        derecha={<ViewToggle vista={listado.vista} onChange={listado.setVista} />}
      >
        <SearchInput
          etiqueta="Buscar en el equipo"
          placeholder="Nombre o correo"
          valor={listado.filtros.search}
          onChange={(valor) => listado.setFiltro('search', valor)}
        />
        <FiltroSelect
          icono={ShieldIcon}
          etiqueta="Filtrar por rol"
          valor={listado.filtros.role}
          onChange={(valor) => listado.setFiltro('role', valor)}
          opciones={ROLES_FILTRO}
        />
        <FiltroSelect
          icono={UsersIcon}
          etiqueta="Filtrar por grupo de acceso"
          valor={listado.filtros.group}
          onChange={(valor) => listado.setFiltro('group', valor)}
          opciones={opcionesDeGrupo}
        />
        <FiltroSelect
          icono={ArrowUpDownIcon}
          etiqueta="Ordenar el equipo"
          valor={listado.filtros.ordering}
          onChange={(valor) => listado.setFiltro('ordering', valor)}
          opciones={ORDENES}
        />
      </FilterBar>

      <DataTable
        columnas={columnas}
        datos={miembros}
        getKey={(fila) => fila.id}
        vista={listado.vista}
        cargando={consulta.isPending}
        error={consulta.error}
        onReintentar={() => consulta.refetch()}
        filasEsperadas={3}
        vacio={
          listado.hayFiltros ? (
            <EmptyState
              icon={UsersIcon}
              title="Sin resultados"
              description={
                elegido === SIN_ACCESO
                  ? 'Nadie se ha quedado sin acceso.'
                  : 'Pruebe otro texto o limpie los filtros.'
              }
            />
          ) : (
            <EmptyState
              icon={UsersIcon}
              title="Solo está usted"
              description="Invite a quien deba entrar a estos servidores."
              action={
                administra && (
                  <Button onClick={onInvitar}>
                    <UserPlusIcon />
                    Invitar a alguien
                  </Button>
                )
              }
            />
          )
        }
      />

      {administra && slug && <PendingInvitations slug={slug} />}

      {administra && slug && <OutsiderGrants slug={slug} />}
    </div>
  )
}

/** Fichas de acceso: rol (si administra, basta), toda la organización,
 *  grupos y lo concreto. Vacío: no entra a nada. */
function describirAcceso(acceso: AccesoDeLaPersona): string[] {
  if (acceso.porRol) return ['Todo, por su rol']

  return [
    ...(acceso.toda
      ? [`Toda la organización · ${NIVELES[acceso.toda.level].etiqueta}`]
      : []),
    ...acceso.grupos.map((grupo) => grupo.name),
    ...(acceso.concretos === 1 ? ['1 acceso concreto'] : []),
    ...(acceso.concretos > 1 ? [`${acceso.concretos} accesos concretos`] : []),
  ]
}
