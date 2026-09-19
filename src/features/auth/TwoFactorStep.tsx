import { AlertCircleIcon, MailIcon } from 'lucide-react'
import { useState } from 'react'

import { CodeInput } from '@/components/code-input'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SubmitConEspera } from '@/features/auth/SubmitConEspera'
import { useSession } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { useCountdown } from '@/lib/use-countdown'
import type { CurrentUser } from '@/types/api'

interface Props {
  challenge: string
  /** Enmascarado por el servidor. */
  email: string
  onVerificado: (user: CurrentUser) => void
  onCancelar: () => void
}

/** Segundo paso del login. El desafío caduca a los cinco minutos: volver
 *  atrás es reintentar con la contraseña, no reenviar el código. */
export function TwoFactorStep({ challenge, email, onVerificado, onCancelar }: Props) {
  const { completeTwoFactor } = useSession()
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorCampo, setErrorCampo] = useState<string | undefined>()
  const [enviando, setEnviando] = useState(false)
  const espera = useCountdown(() => setAviso(null))

  const verificar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    setAviso(null)
    setErrorCampo(undefined)
    setEnviando(true)

    try {
      onVerificado(await completeTwoFactor({ challenge, code: codigo }))
    } catch (error) {
      const fallo = toApiError(error)

      if (fallo.code === 'demasiadas_peticiones' && fallo.retryAfter) {
        espera.start(fallo.retryAfter)
        setAviso(fallo.message)
        return
      }
      // Desafío caducado: no se corrige tecleando, hay que volver atrás
      if (fallo.fieldErrors.challenge) {
        setAviso(fallo.fieldErrors.challenge[0] ?? fallo.message)
        return
      }
      setErrorCampo(fallo.fieldErrors.code?.[0] ?? fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <MailIcon className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Revise su correo</h1>
        <p className="text-muted-foreground text-sm">
          Se ha enviado un código de seis dígitos a{' '}
          <span className="font-machine text-foreground">{email}</span>. Caduca en diez
          minutos.
        </p>
      </header>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={verificar} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="code">Código de verificación</Label>
          <CodeInput
            id="code"
            autoFocus
            aria-invalid={Boolean(errorCampo)}
            value={codigo}
            onValueChange={(valor) => {
              setCodigo(valor)
              setErrorCampo(undefined)
            }}
          />
          <FieldError message={errorCampo} />
        </div>

        <SubmitConEspera
          espera={espera}
          isSubmitting={enviando}
          disabled={codigo.length < 6}
          label="Confirmar"
        />
      </form>

      <p className="text-muted-foreground text-center text-sm">
        ¿No ha llegado?{' '}
        <Button variant="link" className="h-auto p-0 text-sm" onClick={onCancelar}>
          Vuelva a iniciar sesión
        </Button>
      </p>
    </div>
  )
}
