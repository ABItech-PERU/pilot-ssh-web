import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GlobeIcon,
  InfoIcon,
  KeyRoundIcon,
  Loader2Icon,
  MailIcon,
  ShieldOffIcon,
  UserCheckIcon,
  UserXIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ErrorState } from '@/components/states'
import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { BillingZoneDialog } from '@/features/backoffice/BillingZoneDialog'
import { TituloDeBloque } from '@/features/backoffice/OrganizationFacts'
import { llevaPersonal } from '@/features/backoffice/permisos'
import { PersonIdentity } from '@/features/backoffice/PersonIdentity'
import { ReasonDialog } from '@/features/backoffice/ReasonDialog'
import { buildCasePath } from '@/features/backoffice/rutas'
import { Dato, EstadoBadge } from '@/features/credits/partes'
import { toApiError } from '@/lib/api-error'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { PlatformAccountDetail } from '@/types/api'

interface Props {
  /** Null con el panel cerrado. */
  cuentaId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ConMotivo = 'dos-pasos' | 'desactivar' | 'reactivar'

/** Correo, seguridad y organizaciones de una cuenta, con lo que se puede
 *  hacer por ella sin conocer su contraseña. */
export function AccountPanel({ cuentaId, open, onOpenChange }: Props) {
  const { user } = useSession()
  const cliente = useQueryClient()
  const [conMotivo, setConMotivo] = useState<ConMotivo | null>(null)
  const [cambiandoZona, setCambiandoZona] = useState(false)

  const cuenta = useQuery({
    queryKey: platformApi.clavesPlataforma.cuenta(cuentaId ?? ''),
    queryFn: () => platformApi.fetchAccount(cuentaId ?? ''),
    enabled: open && cuentaId !== null,
  })

  const actualizar = async (datos: PlatformAccountDetail, aviso: string) => {
    cliente.setQueryData(platformApi.clavesPlataforma.cuenta(datos.id), datos)
    await cliente.invalidateQueries({ queryKey: ['platform', 'accounts'] })
    await cliente.invalidateQueries({ queryKey: ['platform', 'organizations'] })
    toast.success(aviso)
  }

  const reenviar = useMutation({
    mutationFn: platformApi.resendVerification,
    onSuccess: (datos) => actualizar(datos, `Confirmación reenviada a ${datos.email}.`),
    onError: (error) => toast.error(toApiError(error).message),
  })

  const enlace = useMutation({
    mutationFn: platformApi.sendPasswordReset,
    onSuccess: (datos) => actualizar(datos, `Enlace enviado a ${datos.email}.`),
    onError: (error) => toast.error(toApiError(error).message),
  })

  const conRazon = useMutation({
    mutationFn: ({ accion, motivo }: { accion: ConMotivo; motivo: string }) => {
      const id = cuentaId ?? ''
      if (accion === 'dos-pasos') return platformApi.resetTwoFactor(id, motivo)
      if (accion === 'desactivar') return platformApi.deactivateAccount(id, motivo)
      return platformApi.reactivateAccount(id, motivo)
    },
    onSuccess: async (datos, { accion }) => {
      setConMotivo(null)
      await actualizar(datos, AVISOS[accion])
    },
  })

  const datos = cuenta.data
  const propia = datos?.id === user?.id
  // Una cuenta del personal la gestiona solo quien lleva el personal
  const reservada = Boolean(datos?.is_platform_staff) && !llevaPersonal(user)
  const bloqueada = propia || reservada

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">Cuenta</SheetTitle>
          <SheetDescription>
            Quién es, cómo protege su cuenta y dónde está.
          </SheetDescription>
        </SidePanelHeader>

        <SidePanelBody>
          {cuenta.isPending ? (
            <Esqueleto />
          ) : cuenta.isError ? (
            <div className="p-5">
              <ErrorState error={cuenta.error} onRetry={() => cuenta.refetch()} />
            </div>
          ) : (
            datos && (
              <>
                <div className="border-b px-5 py-4">
                  <PersonIdentity persona={datos} grande />
                </div>

                {bloqueada && (
                  <p className="bg-muted/50 flex items-start gap-2 border-b px-5 py-3 text-sm">
                    <InfoIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    {propia
                      ? 'Es su propia cuenta. La gestiona desde su configuración.'
                      : 'Es del personal. La gestiona quien lleva el personal.'}
                  </p>
                )}

                <TituloDeBloque className="px-5 pt-4 pb-1">Seguridad</TituloDeBloque>
                <dl className="divide-y border-b">
                  <Dato etiqueta="Estado">
                    <EstadoBadge
                      tono={datos.is_active ? 'ok' : 'peligro'}
                      etiqueta={datos.is_active ? 'Activa' : 'Desactivada'}
                    />
                  </Dato>
                  <Dato etiqueta="Correo">
                    {datos.has_verified_email ? (
                      'Confirmado'
                    ) : (
                      <span className="text-warning">Sin confirmar</span>
                    )}
                  </Dato>
                  <Dato etiqueta="Dos pasos">
                    {datos.two_factor_enabled ? (
                      'Activada'
                    ) : (
                      <span className="text-warning">Desactivada</span>
                    )}
                  </Dato>
                  {datos.capabilities.length > 0 && (
                    <Dato etiqueta="Personal">{datos.capabilities.join(', ')}</Dato>
                  )}
                  <Dato etiqueta="Último uso">
                    {datos.last_seen_at ? (
                      <span className="block">
                        <span className="block">
                          {formatRelative(datos.last_seen_at)}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {formatDateTime(datos.last_seen_at)}
                        </span>
                      </span>
                    ) : (
                      'Nunca'
                    )}
                  </Dato>
                  <Dato etiqueta="Alta">{formatDateTime(datos.date_joined)}</Dato>
                </dl>

                <TituloDeBloque className="px-5 pt-4 pb-1">Cobro</TituloDeBloque>
                <dl className="divide-y border-b">
                  <Dato etiqueta="Zona de cobro">
                    <span className="block">
                      <span className="block">{datos.billing_time_zone}</span>
                      <span className="text-muted-foreground block text-xs">
                        {datos.is_billing_zone_fixed
                          ? 'Fija desde su primer día cobrado'
                          : 'Sigue su zona personal hasta el primer cobro'}
                      </span>
                    </span>
                  </Dato>
                </dl>

                <TituloDeBloque className="px-5 pt-4 pb-1">Organizaciones</TituloDeBloque>
                {datos.memberships.length === 0 ? (
                  <p className="text-muted-foreground border-b px-5 py-3 text-sm">
                    No pertenece a ninguna.
                  </p>
                ) : (
                  <ul className="divide-y border-b">
                    {datos.memberships.map((membresia) => (
                      <li
                        key={membresia.id}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                      >
                        <Link
                          to={buildCasePath(membresia.organization.slug)}
                          className="min-w-0 hover:underline"
                        >
                          <span className="block truncate font-medium">
                            {membresia.organization.name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {membresia.role_label}
                          </span>
                        </Link>
                        {membresia.organization_status === 'suspended' && (
                          <EstadoBadge tono="peligro" etiqueta="Suspendida" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <TituloDeBloque className="px-5 pt-4 pb-2">
                  Ayudar con su acceso
                </TituloDeBloque>
                <div className="flex flex-col gap-2 px-5 pb-5">
                  {!datos.has_verified_email && (
                    <Accion
                      icono={MailIcon}
                      pendiente={reenviar.isPending}
                      apagada={bloqueada || !datos.is_active}
                      onClick={() => reenviar.mutate(datos.id)}
                    >
                      Reenviar la confirmación del correo
                    </Accion>
                  )}
                  <Accion
                    icono={KeyRoundIcon}
                    pendiente={enlace.isPending}
                    apagada={bloqueada || !datos.is_active}
                    onClick={() => enlace.mutate(datos.id)}
                  >
                    Enviar enlace para cambiar la contraseña
                  </Accion>
                  {datos.two_factor_enabled && (
                    <Accion
                      icono={ShieldOffIcon}
                      apagada={bloqueada}
                      onClick={() => setConMotivo('dos-pasos')}
                    >
                      Quitar la verificación en dos pasos
                    </Accion>
                  )}
                  <Accion
                    icono={GlobeIcon}
                    apagada={bloqueada}
                    onClick={() => setCambiandoZona(true)}
                  >
                    Cambiar la zona de cobro
                  </Accion>
                  {datos.is_active ? (
                    <Accion
                      icono={UserXIcon}
                      destructiva
                      apagada={bloqueada}
                      onClick={() => setConMotivo('desactivar')}
                    >
                      Desactivar la cuenta
                    </Accion>
                  ) : (
                    <Accion
                      icono={UserCheckIcon}
                      apagada={bloqueada}
                      onClick={() => setConMotivo('reactivar')}
                    >
                      Reactivar la cuenta
                    </Accion>
                  )}
                </div>
              </>
            )
          )}
        </SidePanelBody>

        <SidePanelFooter />
      </SidePanelContent>

      {datos && cambiandoZona && (
        <BillingZoneDialog
          cuenta={datos}
          onCerrar={() => setCambiandoZona(false)}
          onCambiada={async (cambiada) => {
            setCambiandoZona(false)
            await actualizar(cambiada, `Zona de cobro: ${cambiada.billing_time_zone}.`)
          }}
        />
      )}

      {datos && conMotivo && (
        <ReasonDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) {
              setConMotivo(null)
              conRazon.reset()
            }
          }}
          {...DIALOGOS[conMotivo](datos.display_name)}
          pendiente={conRazon.isPending}
          error={conRazon.error ? toApiError(conRazon.error) : null}
          onConfirmar={(motivo) => conRazon.mutate({ accion: conMotivo, motivo })}
        />
      )}
    </Sheet>
  )
}

const AVISOS: Record<ConMotivo, string> = {
  'dos-pasos': 'Verificación en dos pasos quitada.',
  desactivar: 'Cuenta desactivada.',
  reactivar: 'Cuenta reactivada.',
}

const DIALOGOS: Record<
  ConMotivo,
  (nombre: string) => {
    titulo: string
    descripcion: string
    pista: string
    accion: string
    destructiva?: boolean
  }
> = {
  'dos-pasos': (nombre) => ({
    titulo: `¿Quitar los dos pasos de ${nombre}?`,
    descripcion: 'Solo si perdió el acceso a su correo y ya comprobó que es esa persona.',
    pista: 'Diga cómo lo comprobó. Lo verá en la actividad de su cuenta.',
    accion: 'Quitar dos pasos',
    destructiva: true,
  }),
  desactivar: (nombre) => ({
    titulo: `¿Desactivar la cuenta de ${nombre}?`,
    descripcion: 'Se cierran sus sesiones y sus terminales abiertas al instante.',
    pista: 'Lo recibirá por correo.',
    accion: 'Desactivar cuenta',
    destructiva: true,
  }),
  reactivar: (nombre) => ({
    titulo: `Reactivar la cuenta de ${nombre}`,
    descripcion: 'Podrá volver a iniciar sesión.',
    pista: 'Lo recibirá por correo.',
    accion: 'Reactivar cuenta',
  }),
}

function Accion({
  icono: Icono,
  destructiva = false,
  apagada = false,
  pendiente = false,
  onClick,
  children,
}: {
  icono: React.ElementType
  destructiva?: boolean
  apagada?: boolean
  pendiente?: boolean
  onClick: () => void
  children: string
}) {
  return (
    <Button
      variant="outline"
      className={
        destructiva
          ? 'text-destructive hover:text-destructive w-full justify-start'
          : 'w-full justify-start'
      }
      disabled={apagada || pendiente}
      onClick={onClick}
    >
      {pendiente ? <Loader2Icon className="animate-spin" /> : <Icono />}
      {children}
    </Button>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-4 p-5" aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}
