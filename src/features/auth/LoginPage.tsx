import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'

import { FieldError } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFormSkeleton } from '@/features/auth/AuthFormSkeleton'
import { SubmitConEspera } from '@/features/auth/SubmitConEspera'
import { TwoFactorStep } from '@/features/auth/TwoFactorStep'
import { useSession } from '@/features/auth/session'
import {
  conInvitacion,
  useInvitacionDeLaUrl,
  type InvitacionPendiente,
  type VueltaALaInvitacion,
} from '@/features/members/use-invitacion'
import { toApiError } from '@/lib/api-error'
import { applyFieldErrors } from '@/lib/form'
import { useCountdown } from '@/lib/use-countdown'
import type { CurrentUser } from '@/types/api'

const esquema = z.object({
  email: z.email('Indique un correo válido.'),
  password: z.string().min(1, 'Indique la contraseña.'),
})

type Formulario = z.infer<typeof esquema>

const CAMPOS = ['email', 'password'] as const

/** Contraseña aceptada; falta el código del correo. */
interface Pendiente {
  challenge: string
  email: string
}

export function LoginPage() {
  const { invitacion, cargando } = useInvitacionDeLaUrl()

  if (cargando) return <AuthFormSkeleton />
  return <FormularioDeAcceso invitacion={invitacion} />
}

function FormularioDeAcceso({ invitacion }: { invitacion: InvitacionPendiente | null }) {
  const { signIn } = useSession()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [avisoGeneral, setAvisoGeneral] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  // Al acabar la espera se borra el aviso: rojo con botón activo confunde
  const espera = useCountdown(() => setAvisoGeneral(null))
  const puedeRegistrarse = !invitacion || !invitacion.has_account

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: invitacion?.email ?? '', password: '' },
  })

  const continuar = (usuario: CurrentUser) => {
    // Con invitación se vuelve a ella, que se acepta sola al llegar
    if (invitacion) {
      const vuelta: VueltaALaInvitacion = { unirse: true }
      navegar(`/invitations/${invitacion.token}`, { replace: true, state: vuelta })
      return
    }

    const destino = (ubicacion.state as { from?: string } | null)?.from
    navegar(usuario.onboarding.completed ? (destino ?? '/app/servers') : '/onboarding', {
      replace: true,
    })
  }

  const entrar = handleSubmit(async (valores) => {
    setAvisoGeneral(null)
    try {
      const resultado = await signIn(valores)

      if (resultado.estado === 'dos_pasos') {
        setPendiente({ challenge: resultado.challenge, email: resultado.email })
        return
      }
      continuar(resultado.user)
    } catch (error) {
      const fallo = toApiError(error)

      // Límite de intentos: no hay nada que corregir; la espera va en el botón
      if (fallo.code === 'demasiadas_peticiones' && fallo.retryAfter) {
        espera.start(fallo.retryAfter)
        setAvisoGeneral(fallo.message)
        return
      }
      setAvisoGeneral(applyFieldErrors(error, setError, CAMPOS))
    }
  })

  if (pendiente) {
    return (
      <TwoFactorStep
        challenge={pendiente.challenge}
        email={pendiente.email}
        onVerificado={continuar}
        onCancelar={() => setPendiente(null)}
      />
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Inicie sesión</h1>
        <p className="text-muted-foreground text-sm">
          {invitacion
            ? `Entre para unirse a ${invitacion.organization_name}.`
            : 'Gestione sus servidores y quién puede acceder a ellos.'}
        </p>
      </header>

      {avisoGeneral && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{avisoGeneral}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={entrar} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            autoFocus={!invitacion}
            placeholder="nombre@correo.com"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              to="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              ¿Olvidó su contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="off"
            autoFocus={Boolean(invitacion)}
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <SubmitConEspera
          espera={espera}
          isSubmitting={isSubmitting}
          label="Iniciar sesión"
        />
      </form>

      {puedeRegistrarse && (
        <p className="text-muted-foreground text-center text-sm">
          ¿No tiene cuenta?{' '}
          <Link
            to={conInvitacion('/register', invitacion?.token)}
            className="text-foreground font-semibold hover:underline"
          >
            Regístrese gratis
          </Link>
        </p>
      )}
    </div>
  )
}
