import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon, MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'

import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as authApi from '@/features/auth/api'
import { SubmitConEspera } from '@/features/auth/SubmitConEspera'
import { toApiError } from '@/lib/api-error'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'

const esquema = z.object({
  email: z.email('Indique un correo válido.'),
})

type Formulario = z.infer<typeof esquema>

/** Segundos antes de poder reenviar el enlace. */
const ESPERA_PARA_REENVIAR = 60

/** Pide el enlace de recuperación: el correo prueba que es su dueño. */
export function ForgotPasswordPage() {
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const espera = useCountdown()

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: '' },
  })

  const pedir = useMutation({
    mutationFn: (correo: string) => authApi.requestPasswordReset(correo),
    onSuccess: (_, correo) => {
      setEnviadoA(correo)
      setAviso(null)
      espera.start(ESPERA_PARA_REENVIAR)
    },
    onError: (error) => {
      const fallo = toApiError(error)

      if (fallo.code === 'demasiadas_peticiones' && fallo.retryAfter) {
        espera.start(fallo.retryAfter)
      }
      setAviso(fallo.message)
    },
  })

  if (enviadoA) {
    return (
      <Enviado
        correo={enviadoA}
        espera={espera}
        aviso={aviso}
        pendiente={pedir.isPending}
        onReenviar={() => pedir.mutate(enviadoA)}
        onCambiarCorreo={() => {
          setEnviadoA(null)
          setAviso(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">¿Olvidó su contraseña?</h1>
        <p className="text-muted-foreground text-sm">
          Indique su correo y le llegará un enlace para crear una nueva.
        </p>
      </header>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit((valores) => pedir.mutate(valores.email))}
        className="space-y-5"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            autoFocus
            placeholder="nombre@correo.com"
            aria-invalid={Boolean(errors.email)}
            defaultValue={getValues('email')}
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <SubmitConEspera
          espera={espera}
          isSubmitting={pedir.isPending}
          label="Enviar el enlace"
        />
      </form>

      <VolverAlLogin />
    </div>
  )
}

interface EnviadoProps {
  correo: string
  espera: ReturnType<typeof useCountdown>
  aviso: string | null
  pendiente: boolean
  onReenviar: () => void
  onCambiarCorreo: () => void
}

/** No revela si la cuenta existe: delataría quién está registrado. */
function Enviado({
  correo,
  espera,
  aviso,
  pendiente,
  onReenviar,
  onCambiarCorreo,
}: EnviadoProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <MailCheckIcon className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Revise su correo</h1>
        <p className="text-muted-foreground text-sm">
          Si existe una cuenta con <span className="font-machine">{correo}</span>, le
          llegará un enlace para crear una contraseña nueva. Expira en 30 minutos.
        </p>
      </header>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          ¿No le ha llegado? Mire en la carpeta de correo no deseado antes de pedir otro.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button disabled={pendiente || espera.isRunning} onClick={onReenviar}>
            {pendiente && <Loader2Icon className="animate-spin" />}
            {espera.isRunning
              ? `Puede reenviarlo en ${formatCountdown(espera.remaining)}`
              : 'Volver a enviarlo'}
          </Button>
          <Button variant="outline" onClick={onCambiarCorreo}>
            Usar otro correo
          </Button>
        </div>
      </div>

      <VolverAlLogin />
    </div>
  )
}

function VolverAlLogin() {
  return (
    <p className="text-muted-foreground text-center text-sm">
      <Link to="/login" className="text-foreground font-semibold hover:underline">
        Volver a iniciar sesión
      </Link>
    </p>
  )
}
