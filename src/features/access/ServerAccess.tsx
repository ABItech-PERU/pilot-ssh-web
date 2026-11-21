import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClockIcon,
  InfoIcon,
  MailIcon,
  Loader2Icon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { FieldError } from '@/components/field-error'
import { InfoHint } from '@/components/info-hint'
import { EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import * as accessApi from '@/features/access/api'
import { describirNivel, NIVELES, NIVELES_EN_ORDEN } from '@/features/access/levels'
import { describirAlcance, ICONO_DEL_ALCANCE } from '@/features/access/scope'
import { OpcionConIcono } from '@/features/access/OpcionConIcono'
import { ExpiryField } from '@/features/access/ExpiryField'
import {
  decidirAccion,
  describirCobertura,
  etiquetaDeAccion,
  type Accion,
  type Objetivo,
  type Sujeto,
} from '@/features/access/subject'
import { SubjectPicker } from '@/features/access/SubjectPicker'
import { useSession } from '@/features/auth/session'
import * as membersApi from '@/features/members/api'
import { InviteDialog } from '@/features/members/InviteDialog'
import { ROLES } from '@/features/members/roles'
import { buildInitials, formatDate } from '@/lib/format'
import { toApiError } from '@/lib/api-error'
import type {
  AccessGrant,
  AccessGroup,
  AccessLevel,
  Membership,
  Server,
  ServerUser,
} from '@/types/api'

interface Props {
  server: Server
  /** Solo quien administra la organización reparte accesos. */
  puedeRepartir: boolean
  /** `false`: sin peticiones; el panel lo monta cerrado. */
  activo?: boolean
  /** El alta vive solo en «Compartir»: un formulario, no dos. */
  conFormulario?: boolean
  /** Acota a una credencial: muestra lo que le llega y concede sobre ella. */
  credencial?: ServerUser
}

/** Administración (entra por su rol) y lo concedido a grupos o personas.
 *  Lo usan el panel del inventario y la pestaña del servidor. */
export function ServerAccess({
  server,
  puedeRepartir,
  activo = true,
  conFormulario = true,
  credencial,
}: Props) {
  const consulta = useQuery({
    queryKey: accessApi.clavesAcceso.delServidor(server.id),
    queryFn: () => accessApi.fetchServerAccess(server.id),
    enabled: activo,
  })

  const grupos = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(server.organization_slug),
    queryFn: () => accessApi.fetchGroups(server.organization_slug),
    enabled: activo && puedeRepartir && conFormulario,
  })

  if (consulta.isPending) return <Cargando />

  if (consulta.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        No pudimos cargar quién tiene acceso. Vuelva a intentarlo.
      </p>
    )
  }

  // Excluye lo dado a otras credenciales de la maquina; servidor, etiqueta
  // y organizacion si la alcanzan
  const concesiones = credencial
    ? consulta.data.grants.filter(
        (concesion) =>
          concesion.scope !== 'credential' || concesion.server_user === credencial.id,
      )
    : consulta.data.grants

  return (
    <div className="space-y-6">
      {puedeRepartir && conFormulario && (
        <GrantForm
          servidor={server}
          grupos={grupos.data ?? []}
          concesiones={concesiones}
          credencial={credencial}
        />
      )}

      <div className="space-y-5">
        <Bloque titulo="Administra la organización">
          {consulta.data.managers.map((miembro) => (
            <ManagerRow key={miembro.id} miembro={miembro} />
          ))}
        </Bloque>

        <Bloque titulo="Con acceso concedido">
          {concesiones.length === 0 ? (
            <EmptyState
              compacto
              icon={UsersIcon}
              title="Nadie más entra todavía"
              description={
                puedeRepartir && !conFormulario
                  ? 'Use «Compartir» para dar acceso a alguien del equipo.'
                  : credencial
                    ? 'Solo quien administra usa esta credencial.'
                    : 'Solo quien administra entra a este servidor.'
              }
            />
          ) : (
            concesiones.map((concesion) => (
              <GrantRow
                key={concesion.id}
                concesion={concesion}
                servidor={server}
                puedeRepartir={puedeRepartir}
              />
            ))
          )}
        </Bloque>
      </div>
    </div>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {titulo}
      </h3>
      <div className="divide-y rounded-lg border">{children}</div>
    </section>
  )
}

function ManagerRow({ miembro }: { miembro: Membership }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <Avatar className="size-8 shrink-0">
        {miembro.avatar_url && <AvatarImage src={miembro.avatar_url} alt="" />}
        <AvatarFallback className="text-xs font-semibold">
          {buildInitials(miembro.display_name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{miembro.display_name}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {miembro.email}
        </span>
      </span>
      <Badge variant="secondary" className="shrink-0 gap-1">
        <ShieldCheckIcon className="size-3" />
        {ROLES[miembro.role].etiqueta}
      </Badge>
    </div>
  )
}

function GrantRow({
  concesion,
  servidor,
  puedeRepartir,
}: {
  concesion: AccessGrant
  servidor: Server
  puedeRepartir: boolean
}) {
  const cliente = useQueryClient()
  const [quitando, setQuitando] = useState(false)
  // Lo heredado se cambia en su origen: quitarlo aquí afectaría a las demás
  // máquinas
  const heredada = concesion.scope === 'organization' || concesion.scope === 'label'
  const Icono = ICONO_DEL_SUJETO[concesion.subject_type]

  const refrescar = () =>
    cliente.invalidateQueries({
      queryKey: accessApi.clavesAcceso.delServidor(servidor.id),
    })

  const cambiar = useMutation({
    mutationFn: (nivel: AccessLevel) =>
      accessApi.grant({
        organization: servidor.organization_slug,
        group: concesion.group ?? undefined,
        email: concesion.subject_email ?? undefined,
        server: concesion.server ?? undefined,
        server_user: concesion.server_user ?? undefined,
        level: nivel,
        expires_at: concesion.expires_at,
      }),
    onSuccess: async () => {
      await refrescar()
      toast.success('Nivel de acceso cambiado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const quitar = useMutation({
    mutationFn: () => accessApi.revoke(concesion.id),
    onSuccess: async () => {
      await refrescar()
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      setQuitando(false)
      toast.success(`${concesion.subject_name} ya no tiene acceso.`)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icono className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {concesion.subject_name}
        </span>
        <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <Motivo concesion={concesion} servidor={servidor} />
        </span>
      </span>

      {heredada || !puedeRepartir ? (
        <Badge variant="outline" className="shrink-0">
          {NIVELES[concesion.level].etiqueta}
        </Badge>
      ) : (
        <>
          {/* En teléfono, nivel y aspa bajan a su línea para no truncar el
              nombre */}
          <span className="flex basis-full items-center gap-2 pl-11 sm:basis-auto sm:pl-0">
            <Select
              value={concesion.level}
              onValueChange={(valor) => cambiar.mutate(valor as AccessLevel)}
            >
              <SelectTrigger size="sm" className="w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVELES_EN_ORDEN.map((clave) => (
                  <OpcionConIcono key={clave} valor={clave} icono={NIVELES[clave].icono}>
                    {NIVELES[clave].etiqueta}
                  </OpcionConIcono>
                ))}
              </SelectContent>
            </Select>
            {/* Con confirmacion: quitar un acceso nunca va en un solo clic */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar el acceso de ${concesion.subject_name}`}
              disabled={quitar.isPending}
              onClick={() => setQuitando(true)}
            >
              <XIcon />
            </Button>
          </span>

          <ConfirmDialog
            open={quitando}
            onOpenChange={(abierto) => !abierto && setQuitando(false)}
            titulo={`¿Quitar el acceso de ${concesion.subject_name}?`}
            descripcion="Ya no podrá entrar a este servidor. Puede devolverle el acceso cuando quiera."
            detalles={describirLoQuePierde(concesion, servidor)}
            accion="Quitar el acceso"
            destructiva
            pendiente={quitar.isPending}
            onConfirmar={() => quitar.mutate()}
          />
        </>
      )}
    </div>
  )
}

/** Una frase por punto: quien confirma lee a qué alcanzaba lo que quita. */
function describirLoQuePierde(concesion: AccessGrant, servidor: Server): string[] {
  const nivel = NIVELES[concesion.level].etiqueta.toLowerCase()
  const donde =
    concesion.scope === 'credential'
      ? `con ${nombreDeCredencial(concesion, servidor)}`
      : `en ${describirAlcance(concesion)}`

  if (concesion.is_pending) {
    return [`Al aceptar la invitación no podrá ${nivel} ${donde}`]
  }

  const perdidas = [`Deja de poder ${nivel} ${donde}`]

  if (concesion.subject_type === 'group') {
    perdidas.push('Lo pierden todos los miembros del grupo')
  }
  return perdidas
}

/** Alcance sin nombrar la máquina, que ya es el contexto. Con varios
 *  servidores se usa `describirAlcance`. */
function alcanceAqui(concesion: AccessGrant, servidor: Server): string {
  return concesion.scope === 'credential'
    ? `Solo ${nombreDeCredencial(concesion, servidor)}`
    : describirAlcance(concesion)
}

function nombreDeCredencial(concesion: AccessGrant, servidor: Server): string {
  return (
    servidor.users.find((credencial) => credencial.id === concesion.server_user)
      ?.username ?? concesion.scope_label
  )
}

const ICONO_DEL_SUJETO: Record<AccessGrant['subject_type'], React.ElementType> = {
  group: UsersIcon,
  user: UserIcon,
  invitation: MailIcon,
}

/** De dónde le viene el acceso: hace la lista auditable. */
function Motivo({ concesion, servidor }: { concesion: AccessGrant; servidor: Server }) {
  const Icono = ICONO_DEL_ALCANCE[concesion.scope]

  return (
    <>
      <span className="flex items-center gap-1">
        <Icono className="size-3 shrink-0" />
        {alcanceAqui(concesion, servidor)}
      </span>
      {concesion.is_pending && (
        <span className="flex items-center gap-1">
          <MailIcon className="size-3 shrink-0" />
          Lo tendrá al aceptar la invitación
        </span>
      )}
      {concesion.expires_at && (
        <span className="flex items-center gap-1">
          <CalendarClockIcon className="size-3" />
          {concesion.is_expired
            ? 'Caducó'
            : `Hasta el ${formatDate(concesion.expires_at)}`}
        </span>
      )}
    </>
  )
}

/** Valor del selector cuando el acceso es a la maquina entera. */
const TODO_EL_SERVIDOR = 'servidor'

function GrantForm({
  servidor,
  grupos,
  concesiones,
  credencial,
}: {
  servidor: Server
  grupos: AccessGroup[]
  /** Para avisar de lo que ya está cubierto. */
  concesiones: AccessGrant[]
  /** Alcance fijo: sin selector, se comparte solo esta. */
  credencial?: ServerUser
}) {
  const cliente = useQueryClient()
  const { user } = useSession()
  const [sujeto, setSujeto] = useState<Sujeto | null>(null)
  const [sobre, setSobre] = useState(credencial?.id ?? TODO_EL_SERVIDOR)
  const [nivel, setNivel] = useState<AccessLevel>('connect')
  const [caducidad, setCaducidad] = useState('')
  const [invitando, setInvitando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => setAviso(null), [sujeto])

  const equipo = useQuery({
    queryKey: membersApi.clavesEquipo.miembros(servidor.organization_slug),
    queryFn: () => membersApi.fetchMembers(servidor.organization_slug),
  })

  // Invitaciones pendientes: reciben acceso, efectivo al aceptar
  const invitaciones = useQuery({
    queryKey: membersApi.clavesEquipo.invitaciones(servidor.organization_slug),
    queryFn: () => membersApi.fetchInvitations(servidor.organization_slug),
  })

  // Fuera: quien administra (entra por su rol, tiene su bloque) y uno mismo
  // (el backend lo rechaza)
  const personas = (equipo.data ?? []).filter(
    (miembro) =>
      miembro.email !== user?.email &&
      miembro.role !== 'owner' &&
      miembro.role !== 'admin',
  )
  const sinAceptar = (invitaciones.data ?? []).filter(
    (invitacion) => invitacion.status === 'pending',
  )
  // Grupos con toda la organizacion no se ofrecen: no suman. Su fila sigue
  // abajo
  const yaEntranATodo = new Set(
    concesiones
      .filter((concesion) => concesion.scope === 'organization' && !concesion.is_expired)
      .map((concesion) => concesion.group),
  )
  const gruposOfrecidos = grupos.filter((grupo) => !yaEntranATodo.has(grupo.id))

  // El aviso solo aparece con alguien elegido
  const objetivo: Objetivo =
    sobre === TODO_EL_SERVIDOR ? { tipo: 'servidor' } : { tipo: 'credencial', id: sobre }
  const cobertura = sujeto
    ? describirCobertura({
        sujeto,
        concesiones,
        grupos,
        objetivo,
        credenciales: servidor.users,
      })
    : null

  const credencialElegida = servidor.users.find((fila) => fila.id === sobre) ?? null
  const accion = sujeto
    ? decidirAccion({
        sujeto,
        concesiones,
        objetivo,
        servidor: servidor.id,
        nivel,
        caducidad,
      })
    : null

  const conceder = useMutation({
    mutationFn: (_accion: Accion) =>
      accessApi.grant({
        organization: servidor.organization_slug,
        group: sujeto?.tipo === 'grupo' ? sujeto.id : undefined,
        email: sujeto?.tipo === 'persona' ? sujeto.email : undefined,
        server: sobre === TODO_EL_SERVIDOR ? servidor.id : undefined,
        server_user: sobre === TODO_EL_SERVIDOR ? undefined : sobre,
        level: nivel,
        expires_at: caducidad ? `${caducidad}T23:59:59Z` : null,
      }),
    onSuccess: async (concesion, accionPulsada) => {
      await cliente.invalidateQueries({
        queryKey: accessApi.clavesAcceso.delServidor(servidor.id),
      })
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      setSujeto(null)
      setCaducidad('')
      toast.success(
        accionPulsada.tipo === 'dar'
          ? `${concesion.subject_name} ya tiene acceso.`
          : 'Acceso cambiado.',
      )
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(fallo.fieldErrors.email?.[0] ?? fallo.message)
    },
  })

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="sujeto-del-acceso">A quién</Label>
          <InfoHint etiqueta="Qué pasa si elige un grupo">
            Si elige un grupo, el acceso lo reciben todas sus personas.
          </InfoHint>
        </div>
        <SubjectPicker
          id="sujeto-del-acceso"
          grupos={gruposOfrecidos}
          personas={personas}
          invitaciones={sinAceptar}
          elegido={sujeto}
          cargando={equipo.isPending}
          invalido={Boolean(aviso)}
          onElegir={setSujeto}
          onInvitar={() => setInvitando(true)}
        />
        <FieldError message={aviso ?? undefined} />
        {cobertura && (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            {cobertura}
          </p>
        )}
      </div>

      {servidor.users.length > 0 && !credencial && (
        <div className="space-y-2">
          <Label htmlFor="alcance-del-acceso">Sobre</Label>
          <Select value={sobre} onValueChange={setSobre}>
            <SelectTrigger id="alcance-del-acceso" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <OpcionConIcono valor={TODO_EL_SERVIDOR} icono={ICONO_DEL_ALCANCE.server}>
                Todo el servidor
              </OpcionConIcono>
              {servidor.users.map((credencial) => (
                <OpcionConIcono
                  key={credencial.id}
                  valor={credencial.id}
                  icono={ICONO_DEL_ALCANCE.credential}
                >
                  Solo {credencial.username}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nivel-del-acceso">Nivel</Label>
        <Select value={nivel} onValueChange={(valor) => setNivel(valor as AccessLevel)}>
          <SelectTrigger id="nivel-del-acceso" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NIVELES_EN_ORDEN.map((clave) => (
              <OpcionConIcono key={clave} valor={clave} icono={NIVELES[clave].icono}>
                {NIVELES[clave].etiqueta}
              </OpcionConIcono>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {describirNivel(nivel, credencialElegida?.username ?? null)}
        </p>
      </div>

      <ExpiryField id="caducidad-del-acceso" valor={caducidad} onChange={setCaducidad} />

      <Button
        className="w-full"
        disabled={!accion || accion.tipo === 'nada' || conceder.isPending}
        onClick={() => accion && conceder.mutate(accion)}
      >
        {conceder.isPending && <Loader2Icon className="animate-spin" />}
        {accion ? etiquetaDeAccion(accion) : 'Dar acceso'}
      </Button>

      <InviteDialog
        slug={servidor.organization_slug}
        open={invitando}
        onOpenChange={setInvitando}
      />
    </div>
  )
}

/** Misma forma que la pantalla cargada: sin saltos al llegar los datos. */
function Cargando() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-72 w-full rounded-lg" />
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}
