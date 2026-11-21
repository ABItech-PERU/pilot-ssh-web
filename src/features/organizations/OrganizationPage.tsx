import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BuildingIcon,
  CoinsIcon,
  ImageIcon,
  LinkIcon,
  ServerIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { AvatarViewerDialog } from '@/components/avatar-viewer-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SettingsRow, SettingsSection } from '@/components/settings-section'
import { LineaEsqueleto, PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import * as organizationsApi from '@/features/organizations/api'
import { isOwnSpace, useCurrentOrganization } from '@/features/organizations/current'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import {
  OrganizationAddressDialog,
  OrganizationColorDialog,
  OrganizationNameDialog,
} from '@/features/organizations/OrganizationFieldDialog'
import { toApiError } from '@/lib/api-error'
import { formatCredits, formatDateTime, formatRelative } from '@/lib/format'
import type { Organization } from '@/types/api'

const ETIQUETA_ESTADO: Record<string, string> = {
  active: 'Activa',
  pending: 'En revisión',
  suspended: 'Suspendida',
}

/** Nombre, dirección y contenido de la organización; al final, la única
 *  forma de cerrarla. */
export function OrganizationPage() {
  const { slug, organization: resumen } = useCurrentOrganization()
  const navegar = useNavigate()
  const cliente = useQueryClient()
  const [editando, setEditando] = useState<'color' | 'nombre' | 'direccion' | null>(null)
  const [mirando, setMirando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const detalle = useQuery({
    queryKey: organizationsApi.clavesOrganizacion.detalle(slug ?? ''),
    queryFn: () => organizationsApi.fetchOrganization(slug ?? ''),
    enabled: Boolean(slug),
  })

  const eliminar = useMutation({
    mutationFn: organizationsApi.deleteOrganization,
    onSuccess: async () => {
      await cliente.invalidateQueries()
      toast.success('Organización eliminada.')
      setBorrando(false)
      navegar('/app/servers')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  if (detalle.isPending || !detalle.data) return <Esqueleto />

  const organization = detalle.data
  const administra = organization.role === 'owner' || organization.role === 'admin'
  const esPropietaria = organization.role === 'owner'

  return (
    <div className="space-y-6">
      <PageHeader
        title={organization.name}
        description={
          isOwnSpace(organization)
            ? 'Espacio personal. Nadie más tiene acceso.'
            : 'Espacio de trabajo del equipo.'
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 font-normal">
          {isOwnSpace(organization) ? (
            <UserIcon className="size-3" />
          ) : (
            <UsersIcon className="size-3" />
          )}
          {isOwnSpace(organization) ? 'Personal' : 'De equipo'}
        </Badge>
        {organization.status !== 'active' && (
          <Badge className="bg-warning/15 text-warning border-transparent font-normal">
            {ETIQUETA_ESTADO[organization.status] ?? organization.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cifra
          etiqueta="Miembros"
          valor={String(organization.members_count)}
          icono={UsersIcon}
          a="/app/team"
        />
        <Cifra
          etiqueta="Servidores"
          valor={String(organization.servers_count)}
          icono={ServerIcon}
          a="/app/servers"
        />
        <Cifra
          etiqueta="Saldo"
          valor={formatCredits(organization.credit_balance)}
          icono={CoinsIcon}
          a="/app/credits"
        />
      </div>

      {/* Cada dato se cambia por separado */}
      <SettingsSection titulo="General">
        <SettingsRow
          icono={ImageIcon}
          etiqueta="Avatar"
          onEditar={administra ? () => setEditando('color') : undefined}
        >
          {organization.avatar_url ? (
            // A 32 px no se aprecia: un clic la muestra entera
            <button
              type="button"
              aria-label="Ver el avatar en grande"
              onClick={() => setMirando(true)}
              className="focus-visible:outline-ring rounded-md focus-visible:-outline-offset-2 focus-visible:outline-1"
            >
              <OrganizationAvatar organization={organization} />
            </button>
          ) : (
            <OrganizationAvatar organization={organization} />
          )}
        </SettingsRow>
        <SettingsRow
          icono={BuildingIcon}
          etiqueta="Nombre"
          onEditar={administra ? () => setEditando('nombre') : undefined}
        >
          {organization.name}
        </SettingsRow>
        <SettingsRow
          icono={LinkIcon}
          etiqueta="Dirección"
          pista="Identificador único de este espacio."
          razon="Solo la propietaria puede cambiarla."
          onEditar={esPropietaria ? () => setEditando('direccion') : undefined}
        >
          <span className="font-machine">{organization.slug}</span>
        </SettingsRow>
      </SettingsSection>

      <section className="space-y-2">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Detalles
        </h2>
        <div className="grid divide-y rounded-lg border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Dato etiqueta="Rol">{ETIQUETA_ROL[organization.role ?? 'sin']}</Dato>
          <Dato etiqueta="Alta">
            <span title={formatDateTime(organization.created_at)}>
              {formatRelative(organization.created_at)}
            </span>
          </Dato>
        </div>
      </section>

      {esPropietaria && !organization.is_personal && (
        <ZonaDeRiesgo organization={organization} onEliminar={() => setBorrando(true)} />
      )}

      {organization.avatar_url && (
        <AvatarViewerDialog
          imagen={organization.avatar_url}
          titulo={`Avatar de ${organization.name}`}
          open={mirando}
          onOpenChange={setMirando}
        />
      )}

      <OrganizationColorDialog
        organization={organization}
        open={editando === 'color'}
        onOpenChange={(abierto) => setEditando(abierto ? 'color' : null)}
      />
      <OrganizationNameDialog
        organization={organization}
        open={editando === 'nombre'}
        onOpenChange={(abierto) => setEditando(abierto ? 'nombre' : null)}
      />
      <OrganizationAddressDialog
        organization={organization}
        open={editando === 'direccion'}
        onOpenChange={(abierto) => setEditando(abierto ? 'direccion' : null)}
      />
      <ConfirmDialog
        open={borrando}
        onOpenChange={setBorrando}
        titulo={`¿Eliminar ${organization.name}?`}
        descripcion="El equipo pierde el acceso a este espacio."
        detalles={describirPerdida(organization, resumen?.name ?? null)}
        confirmacion={organization.name}
        accion="Eliminar organización"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => eliminar.mutate(organization.slug)}
      />
    </div>
  )
}

const ETIQUETA_ROL: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
  sin: 'Sin rol',
}

/** Lo que se pierde al cerrarla y lo que lo impide. */
function describirPerdida(organization: Organization, nombreActual: string | null) {
  const perdidas = [`${organization.members_count} miembros pierden el acceso`]

  if (organization.servers_count > 0) {
    perdidas.push(`Requiere eliminar antes sus ${organization.servers_count} servidores`)
  }
  perdidas.push('El historial de consumo y la auditoría se conservan')
  if (nombreActual === organization.name) {
    perdidas.push('La sesión vuelve al espacio personal')
  }

  return perdidas
}

function ZonaDeRiesgo({
  organization,
  onEliminar,
}: {
  organization: Organization
  onEliminar: () => void
}) {
  const conServidores = organization.servers_count > 0

  return (
    <div className="border-destructive/30 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">Eliminar la organización</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {conServidores
            ? `Requiere eliminar antes sus ${organization.servers_count} servidores.`
            : 'El equipo pierde el acceso. El consumo y la auditoría se conservan.'}
        </p>
      </div>
      <Button variant="destructive" disabled={conServidores} onClick={onEliminar}>
        <Trash2Icon />
        Eliminar organización
      </Button>
    </div>
  )
}

function Cifra({
  etiqueta,
  valor,
  icono: Icono,
  a,
}: {
  etiqueta: string
  valor: string
  icono: React.ElementType
  a: string
}) {
  return (
    <Link
      to={a}
      className="hover:border-ring focus-visible:outline-ring rounded-lg border p-4 transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1"
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase">
        <Icono className="size-3.5" />
        {etiqueta}
      </span>
      <span className="mt-1 block text-xl font-semibold tabular-nums">{valor}</span>
    </Link>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 text-sm sm:block">
      <span className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase">
        {etiqueta}
      </span>
      <span className="sm:mt-1 sm:block sm:font-medium">{children}</span>
    </div>
  )
}

/** Marco de la página: sin salto al cargar. */
function Esqueleto() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56 sm:h-8" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      <Skeleton className="h-5.5 w-20 rounded-full" />

      <div className="grid gap-3 sm:grid-cols-3">
        {['miembros', 'servidores', 'saldo'].map((cifra) => (
          <div key={cifra} className="rounded-lg border p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-7 w-12" />
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="divide-y rounded-lg border">
          <FilaEsqueleto valor={<Skeleton className="size-8 rounded-md" />} />
          {/* Largo de «Espacio de …»: en móvil baja de línea */}
          <FilaEsqueleto valor={<Skeleton className="h-5 w-48" />} />
          <FilaEsqueleto valor={<Skeleton className="h-5 w-24" />} conPista />
        </div>
      </section>

      <section className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="grid divide-y rounded-lg border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {['rol', 'alta'].map((dato) => (
            <div
              key={dato}
              className="flex items-center justify-between gap-3 p-4 sm:block"
            >
              <LineaEsqueleto className="w-12" />
              <Skeleton className="h-5 w-24 sm:mt-1" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function FilaEsqueleto({
  valor,
  conPista,
}: {
  valor: React.ReactNode
  conPista?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="flex items-center gap-3">
        <Skeleton className="size-4" />
        <div>
          <LineaEsqueleto className="w-20" />
          {conPista && <LineaEsqueleto texto="xs" className="w-48" />}
        </div>
      </span>
      <span className="flex items-center gap-3">
        {valor}
        {/* Móvil: lápiz cuadrado */}
        <Skeleton className="h-9 w-9 sm:w-20" />
      </span>
    </div>
  )
}
