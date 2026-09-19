import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { FieldError } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import * as authApi from '@/features/auth/api'
import { SubmitConEspera } from '@/features/auth/SubmitConEspera'
import { applyFieldErrors } from '@/lib/form'
import { useCountdown } from '@/lib/use-countdown'

const esquema = z.object({
  new_password: z.string().min(8, 'Use al menos 8 caracteres.'),
})

type Formulario = z.infer<typeof esquema>

const CAMPOS = ['new_password'] as const

/** Contraseña nueva con el testigo del enlace. Sin testigo se avisa antes
 *  de teclear. */
export function ResetPasswordPage() {
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const [aviso, setAviso] = useState<string | null>(null)
  const espera = useCountdown(() => setAviso(null))
  const testigo = parametros.get('token') ?? ''

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { new_password: '' },
  })

  const restablecer = useMutation({
    mutationFn: (valores: Formulario) =>
      authApi.resetPassword({ token: testigo, new_password: valores.new_password }),
    onSuccess: () => {
      toast.success('Contraseña actualizada. Ya puede iniciar sesión.')
      navegar('/login', { replace: true })
    },
    onError: (error) => setAviso(applyFieldErrors(error, setError, CAMPOS)),
  })

  if (!testigo) return <SinEnlace />

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Cree una contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Al guardarla se cerrarán las sesiones abiertas en otros equipos.
        </p>
      </header>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit((valores) => restablecer.mutate(valores))}
        className="space-y-5"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="new_password">Contraseña nueva</Label>
          <PasswordInput
            id="new_password"
            autoComplete="off"
            autoFocus
            aria-invalid={Boolean(errors.new_password)}
            {...register('new_password')}
          />
          {errors.new_password?.message ? (
            <FieldError message={errors.new_password.message} />
          ) : (
            <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
          )}
        </div>

        <SubmitConEspera
          espera={espera}
          isSubmitting={restablecer.isPending}
          label="Guardar la contraseña"
        />
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link to="/login" className="text-foreground font-semibold hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}

function SinEnlace() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Este enlace no sirve</h1>
        <p className="text-muted-foreground text-sm">
          Abra el enlace del correo tal cual llegó, o pida uno nuevo.
        </p>
      </header>

      <Button asChild size="lg" className="w-full">
        <Link to="/forgot-password">Pedir un enlace nuevo</Link>
      </Button>
    </div>
  )
}
