import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClockIcon,
  PlusIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/states'
import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import * as accessApi from '@/features/access/api'
import { NIVELES, NIVELES_EN_ORDEN } from '@/features/access/levels'
import { OpcionConIcono } from '@/features/access/OpcionConIcono'
import { describirAlcance, ICONO_DEL_ALCANCE } from '@/features/access/scope'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import type { AccessGrant, AccessLevel, Membership, ReachableServer } from '@/types/api'

interface Props {
  slug: string
  miembro: Membership | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A qué máquinas entra alguien y por qué, sin abrir grupo por grupo. El
 *  acceso que sobra se quita aquí mismo. */
export function MemberAccessSheet({ slug, miembro, open, onOpenChange }: Props) {
  const consulta = useQuery({
    queryKey: accessApi.clavesAcceso.dePersona(miembro?.id ?? ''),
    queryFn: () => accessApi.fetchMemberAccess(miembro!.id),
    enabled: open && Boolean(miembro),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent className="sm:max-w-lg">
        <SidePanelHeader>
          <SheetTitle className="text-lg">
            {miembro ? `Accesos de ${miembro.display_name}` : 'Accesos'}
          </SheetTitle>
          <SheetDescription>
            A qué servidores entra y por qué entra a cada uno.
          </SheetDescription>
        </SidePanelHeader>

        <SidePanelBody className="space-y-4 p-5">
          {miembro && <TodaLaOrganizacion slug={slug} miembro={miembro} />}
          {miembro && <SusGrupos slug={slug} miembro={miembro} />}

          {consulta.isPending ? (
            <Cargando />
          ) : consulta.isError ? (
            <p className="text-muted-foreground text-sm">
              No pudimos cargar sus accesos. Cierre y vuelva a abrir.
            </p>
          ) : consulta.data.servers.length === 0 ? (
            <EmptyState
              enmarcado
              icon={ServerIcon}
              title="No entra a ningún servidor"
              description="Dele toda la organización arriba, o compártale un servidor desde su ficha."
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {consulta.data.servers.map((servidor) => (
                <MaquinaAlcanzada key={servidor.id} servidor={servidor} />
              ))}
            </ul>
          )}
        </SidePanelBody>
        <SidePanelFooter />
      </SidePanelContent>
    </Sheet>
  )
}

const SOLO_LO_DE_APARTE = 'ninguno'

/** Alcance a su nombre, no un grupo: sin grupos de una sola persona. */
function TodaLaOrganizacion({ slug, miembro }: { slug: string; miembro: Membership }) {
  const cliente = useQueryClient()

  // Misma clave que el resto del equipo: reutiliza la consulta en cache
  const concesiones = useQuery({
    queryKey: accessApi.clavesAcceso.concesiones(slug),
    queryFn: () => accessApi.fetchGrants(slug),
  })

  const actual = (concesiones.data ?? []).find(
    (concesion) =>
      concesion.subject_type === 'user' &&
      concesion.subject_email === miembro.email &&
      concesion.scope === 'organization' &&
      !concesion.is_expired,
  )

  const cambiar = useMutation({
    mutationFn: async (valor: string) => {
      if (valor !== SOLO_LO_DE_APARTE) {
        await accessApi.grant({
          organization: slug,
          email: miembro.email,
          level: valor as AccessLevel,
        })
      } else if (actual) {
        await accessApi.revoke(actual.id)
      }
    },
    onSuccess: async () => {
      await accessApi.invalidarAcceso(cliente)
      toast.success('Acceso cambiado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  // Quien administra entra a todo por su rol: sin selector
  const porSuRol = miembro.role === 'owner' || miembro.role === 'admin'

  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Toda la organización
      </h3>
      {porSuRol ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <ShieldCheckIcon className="size-4 shrink-0" />
          Entra a todo por su rol.
        </p>
      ) : (
        <Select
          value={actual?.level ?? SOLO_LO_DE_APARTE}
          disabled={concesiones.isPending || cambiar.isPending}
          onValueChange={(valor) => cambiar.mutate(valor)}
        >
          <SelectTrigger className="w-full" aria-label="Acceso a toda la organización">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <OpcionConIcono valor={SOLO_LO_DE_APARTE} icono={XIcon}>
              Solo lo que se le dé aparte
            </OpcionConIcono>
            {NIVELES_EN_ORDEN.map((clave) => (
              <OpcionConIcono key={clave} valor={clave} icono={NIVELES[clave].icono}>
                {NIVELES[clave].etiqueta} en todos los servidores
              </OpcionConIcono>
            ))}
          </SelectContent>
        </Select>
      )}
    </section>
  )
}

/** Alta y baja de grupos en el sitio: de ahí viene casi todo su acceso. */
function SusGrupos({ slug, miembro }: { slug: string; miembro: Membership }) {
  const cliente = useQueryClient()

  const grupos = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(slug),
    queryFn: () => accessApi.fetchGroups(slug),
  })

  const refrescar = () => accessApi.invalidarAcceso(cliente)

  const meter = useMutation({
    mutationFn: (grupo: string) => accessApi.addToGroup(grupo, miembro.id),
    onSuccess: refrescar,
    onError: (error) => toast.error(toApiError(error).message),
  })

  const sacar = useMutation({
    mutationFn: (grupo: string) => accessApi.removeFromGroup(grupo, miembro.id),
    onSuccess: async (_, grupo) => {
      await refrescar()
      toast.success('Ya no está en el grupo.', {
        action: { label: 'Deshacer', onClick: () => meter.mutate(grupo) },
      })
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const todos = grupos.data ?? []
  const dentro = todos.filter((grupo) =>
    grupo.members.some((uno) => uno.membership === miembro.id),
  )
  const fuera = todos.filter((grupo) => !dentro.includes(grupo))

  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Sus grupos
      </h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {dentro.length === 0 && (
          <span className="text-muted-foreground text-sm">En ninguno</span>
        )}
        {dentro.map((grupo) => (
          <span
            key={grupo.id}
            className="bg-secondary text-secondary-foreground inline-flex h-7 items-center gap-1 rounded-md pr-1 pl-2 text-xs"
          >
            <UsersIcon className="size-3 shrink-0" />
            <span className="max-w-40 truncate">{grupo.name}</span>
            <button
              type="button"
              aria-label={`Sacar de ${grupo.name}`}
              disabled={sacar.isPending}
              className="hover:text-foreground text-muted-foreground rounded p-0.5"
              onClick={() => sacar.mutate(grupo.id)}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}

        {fuera.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusIcon />
                Añadir a un grupo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
              {fuera.map((grupo) => (
                <DropdownMenuItem key={grupo.id} onSelect={() => meter.mutate(grupo.id)}>
                  <UsersIcon />
                  <span className="truncate">{grupo.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </section>
  )
}

function MaquinaAlcanzada({ servidor }: { servidor: ReachableServer }) {
  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{servidor.name}</span>
          <span className="text-muted-foreground font-machine block truncate text-xs">
            {servidor.ip}
          </span>
        </span>
        <Badge variant="outline" className="shrink-0">
          {NIVELES[servidor.level].etiqueta}
        </Badge>
      </div>

      <ul className="space-y-1">
        {servidor.by_role && (
          <li className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheckIcon className="size-3 shrink-0" />
            Administra la organización
          </li>
        )}
        {servidor.reasons.map((motivo) => (
          <Motivo key={motivo.id} motivo={motivo} />
        ))}
      </ul>
    </li>
  )
}

/** Lo dado a su nombre se quita aquí; lo de un grupo, no: afectaría a
 *  los demás miembros (para eso está «Sus grupos»). */
function Motivo({ motivo }: { motivo: AccessGrant }) {
  const cliente = useQueryClient()
  const Icono = ICONO_DEL_ALCANCE[motivo.scope]
  const suya = motivo.subject_type === 'user'

  const quitar = useMutation({
    mutationFn: () => accessApi.revoke(motivo.id),
    onSuccess: async () => {
      await accessApi.invalidarAcceso(cliente)
      toast.success('Acceso retirado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <li className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
      <span className="flex items-center gap-1.5">
        <Icono className="size-3 shrink-0" />
        {motivo.subject_type === 'group'
          ? `Por el grupo ${motivo.subject_name}`
          : 'Concesión a su nombre'}
        {' · '}
        {describirAlcance(motivo)}
      </span>
      {motivo.expires_at && (
        <span className="flex items-center gap-1">
          <CalendarClockIcon className="size-3" />
          Hasta el {formatDate(motivo.expires_at)}
        </span>
      )}
      {suya && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={`Quitar la concesión a ${describirAlcance(motivo)}`}
          disabled={quitar.isPending}
          onClick={() => quitar.mutate()}
        >
          <XIcon className="size-3.5" />
        </Button>
      )}
    </li>
  )
}

function Cargando() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  )
}
