import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  Building2Icon,
  HandCoinsIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useParams } from 'react-router'
import { toast } from 'sonner'

import { TabNav } from '@/components/tab-nav'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import {
  OwnOrganizationNotice,
  SuspensionNotice,
} from '@/features/backoffice/CaseNotices'
import { CreditGrantDialog } from '@/features/backoffice/CreditGrantDialog'
import { describirEstadoDeOrganizacion } from '@/features/backoffice/organizaciones'
import { atiende, llevaFinanzas } from '@/features/backoffice/permisos'
import { ReasonDialog } from '@/features/backoffice/ReasonDialog'
import {
  buildCasePath,
  buildPlatformPath,
  type PestanaDelCaso,
} from '@/features/backoffice/rutas'
import { EstadoBadge } from '@/features/credits/partes'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import { toApiError } from '@/lib/api-error'

type Accion = 'suspender' | 'levantar' | 'asignar'

/** El caso de un cliente, por pestañas. De sus servidores solo el nombre:
 *  dónde están y cómo se entra es del cliente. */
export function OrganizationCasePage() {
  const { slug = '' } = useParams()
  const { user } = useSession()
  const cliente = useQueryClient()
  const [accion, setAccion] = useState<Accion | null>(null)

  const detalle = useQuery({
    queryKey: platformApi.clavesPlataforma.organizacion(slug),
    queryFn: () => platformApi.fetchOrganization(slug),
  })

  const suspension = useMutation({
    mutationFn: ({ levantar, motivo }: { levantar: boolean; motivo: string }) =>
      levantar
        ? platformApi.liftSuspension(slug, motivo)
        : platformApi.suspendOrganization(slug, motivo),
    onSuccess: async (organizacion) => {
      await platformApi.invalidarPlataforma(cliente)
      setAccion(null)
      toast.success(
        organizacion.suspension
          ? `${organizacion.name} suspendida.`
          : `Suspensión de ${organizacion.name} levantada.`,
      )
    },
  })

  if (detalle.isError) return <NoEncontrada />
  if (detalle.isPending) return <Esqueleto />

  const organizacion = detalle.data
  const quienAtiende = atiende(user)
  const propia = organizacion.is_own
  const estado = describirEstadoDeOrganizacion(organizacion.status)

  const pestanas: { etiqueta: string; pestana?: PestanaDelCaso; visible: boolean }[] = [
    { etiqueta: 'Resumen', visible: true },
    { etiqueta: 'Equipo', pestana: 'team', visible: true },
    { etiqueta: 'Acceso', pestana: 'access', visible: quienAtiende },
    { etiqueta: 'Dinero', pestana: 'money', visible: true },
    { etiqueta: 'Notas', pestana: 'notes', visible: true },
  ]

  return (
    <div className="space-y-6">
      <Link
        to={buildPlatformPath('organizations')}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Organizaciones
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <OrganizationAvatar organization={organizacion} tamano="md" />
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight break-words">
              {organizacion.name}
            </h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-machine break-all">{organizacion.slug}</span>
              <span aria-hidden>·</span>
              <span>{organizacion.is_personal ? 'Espacio personal' : 'Equipo'}</span>
              <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
            </p>
          </div>
        </div>

        {/* En móvil se doblan en vez de salirse de la pantalla */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {quienAtiende &&
            (organizacion.suspension ? (
              <Button
                variant="outline"
                disabled={propia}
                onClick={() => setAccion('levantar')}
              >
                <PlayCircleIcon />
                Levantar suspensión
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={propia}
                onClick={() => setAccion('suspender')}
              >
                <PauseCircleIcon />
                Suspender
              </Button>
            ))}
          {llevaFinanzas(user) && (
            <Button disabled={propia} onClick={() => setAccion('asignar')}>
              <HandCoinsIcon />
              Asignar créditos
            </Button>
          )}
        </div>
      </header>

      {(propia || organizacion.suspension) && (
        <div className="space-y-2">
          {propia && <OwnOrganizationNotice />}
          {organizacion.suspension && (
            <SuspensionNotice suspension={organizacion.suspension} />
          )}
        </div>
      )}

      <TabNav
        etiqueta="Secciones de la organización"
        pestanas={pestanas
          .filter((pestana) => pestana.visible)
          .map(({ etiqueta, pestana }) => ({
            to: buildCasePath(organizacion.slug, pestana),
            etiqueta,
            cuenta: pestana === 'team' ? organizacion.members_count : null,
            end: true,
          }))}
      />

      <Outlet context={organizacion} />

      <ReasonDialog
        open={accion === 'suspender' || accion === 'levantar'}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setAccion(null)
            suspension.reset()
          }
        }}
        {...(accion === 'levantar'
          ? {
              titulo: `Levantar la suspensión de ${organizacion.name}`,
              descripcion: 'Su equipo vuelve a abrir terminales en el acto.',
              accion: 'Levantar suspensión',
            }
          : {
              titulo: `¿Suspender ${organizacion.name}?`,
              descripcion:
                'Nadie de su equipo podrá abrir terminales. Las abiertas se cierran al instante.',
              accion: 'Suspender',
              destructiva: true,
            })}
        pista="Lo leen quienes la administran, en su correo y en su auditoría."
        pendiente={suspension.isPending}
        error={suspension.error ? toApiError(suspension.error) : null}
        onConfirmar={(motivo) =>
          suspension.mutate({ levantar: accion === 'levantar', motivo })
        }
      />

      <CreditGrantDialog
        organizacion={accion === 'asignar' ? organizacion : null}
        open={accion === 'asignar'}
        onOpenChange={(abierto) => !abierto && setAccion(null)}
      />
    </div>
  )
}

/** No existe o el enlace está mal: la plataforma no distingue. */
function NoEncontrada() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
        <Building2Icon className="size-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">No encontramos esta organización</h1>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Puede que se haya eliminado o que el enlace esté mal.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link to={buildPlatformPath('organizations')}>
          <ArrowLeftIcon />
          Volver a organizaciones
        </Link>
      </Button>
    </div>
  )
}

/** Misma forma que la ficha: al cargar no salta nada. */
function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-5 w-32" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  )
}
