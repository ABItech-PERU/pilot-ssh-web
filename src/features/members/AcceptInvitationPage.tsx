import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, BuildingIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CLAVE_USUARIO, useSession } from '@/features/auth/session'
import * as membersApi from '@/features/members/api'
import {
  conInvitacion,
  type VueltaALaInvitacion,
} from '@/features/members/use-invitacion'
import { setCurrentOrganizationSlug } from '@/features/organizations/current'
import { toApiError } from '@/lib/api-error'

/** Destino del enlace del correo. Legible sin cuenta: quien la recibe debe
 *  saber a qué le invitan antes de crearse una. */
export function AcceptInvitationPage() {
  const { token = '' } = useParams()
  const { isAuthenticated, user, signOut } = useSession()
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [aviso, setAviso] = useState<string | null>(null)
  // Un solo intento automático; si falla, queda el botón para reintentar
  const unirseAlVolver = useRef(
    (ubicacion.state as VueltaALaInvitacion | null)?.unirse === true,
  )

  const consulta = useQuery({
    queryKey: membersApi.clavesEquipo.invitacion(token),
    queryFn: () => membersApi.fetchInvitation(token),
    retry: false,
  })

  const aceptar = useMutation({
    mutationFn: () => membersApi.acceptInvitation(token),
    onSuccess: async () => {
      const invitacion = consulta.data!
      // Se entra en la organización nueva; el usuario en caché aún no la
      // conoce
      setCurrentOrganizationSlug(invitacion.organization_slug)
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success(`Ya está en ${invitacion.organization_name}.`)
      navegar(user?.onboarding.completed ? '/app/servers' : '/onboarding', {
        replace: true,
      })
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const invitacion = consulta.data
  const esDeOtraCuenta = Boolean(
    isAuthenticated &&
    user &&
    invitacion &&
    user.email.toLowerCase() !== invitacion.email.toLowerCase(),
  )
  const puedeUnirse = Boolean(
    isAuthenticated && invitacion?.can_be_accepted && !esDeOtraCuenta,
  )

  const { mutate: unirse } = aceptar
  useEffect(() => {
    if (!puedeUnirse || !unirseAlVolver.current) return
    unirseAlVolver.current = false
    unirse()
  }, [puedeUnirse, unirse])

  if (consulta.isPending) return <Cargando />

  if (consulta.isError) {
    return (
      <Aviso
        titulo="Esta invitación no existe"
        descripcion="El enlace puede estar incompleto. Pida que se la envíen de nuevo."
      />
    )
  }

  if (!consulta.data.can_be_accepted) {
    return (
      <Aviso
        titulo="Esta invitación ya no vale"
        descripcion="Caducó o fue cancelada. Pida una nueva a quien administra la organización."
      />
    )
  }

  const { data } = consulta
  // Sin sesión se indica si el correo tiene cuenta: entrar o crearla
  const cuenta = isAuthenticated
    ? ''
    : data.has_account
      ? ', que ya tiene cuenta'
      : ', que aún no tiene cuenta'

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <BuildingIcon className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          Le han invitado a {data.organization_name}
        </h1>
        {/* Sin nombrar el rol: se ve al entrar, y de antemano puede
            sonar a rebaja */}
        <p className="text-muted-foreground text-sm">
          {data.invited_by_name
            ? `${data.invited_by_name} le invita a unirse.`
            : 'Le invitan a unirse a esta organización.'}
        </p>
      </header>

      <div className="bg-muted/40 rounded-lg border p-4 text-sm">
        <p className="text-muted-foreground">
          La invitación es para{' '}
          <span className="font-machine text-foreground">{data.email}</span>
          {cuenta}. Al entrar verá los servidores a los que le den acceso.
        </p>
      </div>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      {!isAuthenticated ? (
        <EntradaSinSesion token={token} tieneCuenta={data.has_account} />
      ) : esDeOtraCuenta ? (
        <div className="space-y-3">
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              Su sesión es de {user?.email}. Para aceptarla, cierre sesión y continúe con{' '}
              {data.email}.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => void signOut()}
          >
            Cerrar sesión
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full"
          disabled={aceptar.isPending}
          onClick={() => aceptar.mutate()}
        >
          {aceptar.isPending && <Loader2Icon className="animate-spin" />}
          Unirse a {data.organization_name}
        </Button>
      )}
    </div>
  )
}

/** Un solo camino, según tenga cuenta o no: con dos se elige a ciegas.
 *  El testigo viaja en el enlace para no perderse. */
function EntradaSinSesion({
  token,
  tieneCuenta,
}: {
  token: string
  tieneCuenta: boolean
}) {
  return (
    <Button asChild size="lg" className="w-full">
      <Link to={conInvitacion(tieneCuenta ? '/login' : '/register', token)}>
        {tieneCuenta ? 'Iniciar sesión y unirse' : 'Crear cuenta y unirse'}
      </Link>
    </Button>
  )
}

function Aviso({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground text-sm">{descripcion}</p>
      </header>

      <Button asChild size="lg" className="w-full">
        <Link to="/login">Ir a iniciar sesión</Link>
      </Button>
    </div>
  )
}

function Cargando() {
  return (
    <div className="space-y-6">
      <Skeleton className="size-11 rounded-full" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  )
}
