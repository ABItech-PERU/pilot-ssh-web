import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as authApi from '@/features/auth/api'
import { FieldError } from '@/components/field-error'
import { AuthFormSkeleton } from '@/features/auth/AuthFormSkeleton'
import { SubmitConEspera } from '@/features/auth/SubmitConEspera'
import { useSession } from '@/features/auth/session'
import { TERMS_VERSION } from '@/features/legal/vigencia'
import {
  conInvitacion,
  useInvitacionDeLaUrl,
  type InvitacionPendiente,
} from '@/features/members/use-invitacion'
import { setCurrentOrganizationSlug } from '@/features/organizations/current'
import { toApiError } from '@/lib/api-error'
import { applyFieldErrors } from '@/lib/form'
import { useCountdown } from '@/lib/use-countdown'

/** Alta mínima: nombre y equipo se piden ya dentro, donde abandonar
 *  cuesta más. */
const esquema = z.object({
  email: z.email('Indique un correo válido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
  aceptaTerminos: z
    .boolean()
    .refine(Boolean, 'Acepte los términos y la política de privacidad.'),
})

type Formulario = z.infer<typeof esquema>

const CAMPOS = ['email', 'password'] as const

export function RegisterPage() {
  const { invitacion, cargando } = useInvitacionDeLaUrl()

  if (cargando) return <AuthFormSkeleton />
  return <FormularioDeAlta invitacion={invitacion} />
}

function FormularioDeAlta({ invitacion }: { invitacion: InvitacionPendiente | null }) {
  const { signIn } = useSession()
  const navegar = useNavigate()
  const [avisoGeneral, setAvisoGeneral] = useState<string | null>(null)
  // Al acabar la espera se borra el aviso: rojo con botón activo confunde
  const espera = useCountdown(() => setAvisoGeneral(null))
  // Entrar con otra cuenta no aceptaría la invitación
  const puedeEntrar = !invitacion || invitacion.has_account

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      email: invitacion?.email ?? '',
      password: '',
      aceptaTerminos: false,
    },
  })

  const crearCuenta = handleSubmit(async (valores) => {
    setAvisoGeneral(null)
    try {
      await authApi.register({
        email: valores.email,
        password: valores.password,
        terms_version: TERMS_VERSION,
        invitation: invitacion?.token,
      })
      // La cuenta nace en el equipo: el panel se abre en él
      if (invitacion) setCurrentOrganizationSlug(invitacion.organization_slug)
      // El registro no devuelve tokens: se entra con los mismos datos
      await signIn(valores)
      if (invitacion) toast.success(`Ya está en ${invitacion.organization_name}.`)
      navegar('/onboarding', { replace: true })
    } catch (error) {
      const fallo = toApiError(error)

      // Límite de altas: no hay nada que corregir; la espera va en el botón
      if (fallo.code === 'demasiadas_peticiones' && fallo.retryAfter) {
        espera.start(fallo.retryAfter)
        setAvisoGeneral(fallo.message)
        return
      }
      setAvisoGeneral(applyFieldErrors(error, setError, CAMPOS))
    }
  })

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Cree su cuenta</h1>
        <p className="text-muted-foreground text-sm">
          {invitacion
            ? `Al crearla entrará en ${invitacion.organization_name}.`
            : 'Confirme su correo y reciba 500 créditos de regalo. Sin tarjeta.'}
        </p>
      </header>

      {avisoGeneral && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{avisoGeneral}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={crearCuenta} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          {/* Fijo con invitación: con otro correo no entraría al equipo */}
          <Input
            id="email"
            type="email"
            autoComplete="off"
            autoFocus={!invitacion}
            readOnly={Boolean(invitacion)}
            placeholder="nombre@correo.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={invitacion ? 'pista-email' : undefined}
            {...register('email')}
          />
          {errors.email?.message ? (
            <FieldError message={errors.email.message} />
          ) : (
            invitacion && (
              <p id="pista-email" className="text-muted-foreground text-xs">
                Es el correo al que llegó la invitación.
              </p>
            )
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="off"
            autoFocus={Boolean(invitacion)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="pista-password"
            {...register('password')}
          />
          {errors.password?.message ? (
            <FieldError message={errors.password.message} />
          ) : (
            <p id="pista-password" className="text-muted-foreground text-xs">
              Mínimo 8 caracteres. Evita palabras comunes.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Controller
              control={control}
              name="aceptaTerminos"
              render={({ field }) => (
                <Checkbox
                  id="acepta-terminos"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(marcada) => field.onChange(marcada === true)}
                  aria-invalid={Boolean(errors.aceptaTerminos)}
                />
              )}
            />
            <Label
              htmlFor="acepta-terminos"
              className="text-muted-foreground text-sm leading-snug font-normal"
            >
              <span>
                Acepto los{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  className="text-foreground font-medium underline-offset-2 hover:underline"
                >
                  Términos
                </Link>{' '}
                y la{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  className="text-foreground font-medium underline-offset-2 hover:underline"
                >
                  Política de privacidad
                </Link>
              </span>
            </Label>
          </div>
          {errors.aceptaTerminos?.message && (
            <FieldError message={errors.aceptaTerminos.message} />
          )}
        </div>

        <SubmitConEspera
          espera={espera}
          isSubmitting={isSubmitting}
          label="Crear cuenta"
        />
      </form>

      {puedeEntrar && (
        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tiene cuenta?{' '}
          <Link
            to={conInvitacion('/login', invitacion?.token)}
            className="text-foreground font-semibold hover:underline"
          >
            Inicie sesión
          </Link>
        </p>
      )}
    </div>
  )
}
