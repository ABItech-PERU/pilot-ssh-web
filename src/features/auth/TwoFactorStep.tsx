import { AlertCircleIcon, KeyRoundIcon, MailIcon, SmartphoneIcon } from 'lucide-react'
import { useState } from 'react'

import { CodeInput } from '@/components/code-input'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitConEspera } from '@/features/auth/SubmitConEspera'
import { useSession } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { useCountdown } from '@/lib/use-countdown'
import type { CurrentUser, TwoFactorMethod } from '@/types/api'

interface Props {
  challenge: string
  /** Enmascarado por el servidor. */
  email: string
  metodo: TwoFactorMethod
  onVerificado: (user: CurrentUser) => void
  onCancelar: () => void
}

type Via = 'correo' | 'app' | 'respaldo'

const CABECERA: Record<Via, { icono: React.ElementType; titulo: string }> = {
  correo: { icono: MailIcon, titulo: 'Revise su correo' },
  app: { icono: SmartphoneIcon, titulo: 'Abra su app autenticadora' },
  respaldo: { icono: KeyRoundIcon, titulo: 'Use un código de respaldo' },
}

/** Segundo paso del login. El desafío caduca a los cinco minutos: volver
 *  atrás es reintentar con la contraseña, no reenviar el código. */
export function TwoFactorStep({
  challenge,
  email,
  metodo,
  onVerificado,
  onCancelar,
}: Props) {
  const { completeTwoFactor } = useSession()
  const [via, setVia] = useState<Via>(metodo === 'app' ? 'app' : 'correo')
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorCampo, setErrorCampo] = useState<string | undefined>()
  const [enviando, setEnviando] = useState(false)
  const espera = useCountdown(() => setAviso(null))

  const verificar = async (valor: string) => {
    setAviso(null)
    setErrorCampo(undefined)
    setEnviando(true)

    try {
      onVerificado(await completeTwoFactor({ challenge, code: valor }))
    } catch (error) {
      const fallo = toApiError(error)

      if (fallo.code === 'demasiadas_peticiones' && fallo.retryAfter) {
        espera.start(fallo.retryAfter)
        setAviso(fallo.message)
        return
      }
      // Desafío caducado o agotado: no se corrige tecleando, hay que volver
      if (fallo.fieldErrors.challenge) {
        setAviso(fallo.fieldErrors.challenge[0] ?? fallo.message)
        return
      }
      setErrorCampo(fallo.fieldErrors.code?.[0] ?? fallo.message)
      // El de la app cambia cada 30 s: se escribe otro, no se corrige
      if (via === 'app') setCodigo('')
    } finally {
      setEnviando(false)
    }
  }

  const cambiarVia = (nueva: Via) => {
    setVia(nueva)
    setCodigo('')
    setErrorCampo(undefined)
  }

  const completo =
    via === 'respaldo' ? codigo.replace(/\W/g, '').length >= 10 : codigo.length === 6
  const { icono: Icono, titulo } = CABECERA[via]

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <Icono className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground text-sm">
          {via === 'correo' ? (
            <>
              Se ha enviado un código de seis dígitos a{' '}
              <span className="font-machine text-foreground">{email}</span>. Caduca en
              diez minutos.
            </>
          ) : via === 'app' ? (
            'Escriba el código de seis dígitos que muestra para Pilot SSH.'
          ) : (
            'Uno de los diez que guardó al activar la app. Cada uno sirve una sola vez.'
          )}
        </p>
      </header>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          void verificar(codigo)
        }}
        className="space-y-5"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="code">
            {via === 'respaldo' ? 'Código de respaldo' : 'Código de verificación'}
          </Label>
          {via === 'respaldo' ? (
            <Input
              id="code"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="xxxxx-xxxxx"
              className="font-machine h-12 text-center text-lg tracking-widest"
              aria-invalid={Boolean(errorCampo)}
              value={codigo}
              onChange={(evento) => {
                setCodigo(evento.target.value.slice(0, 16))
                setErrorCampo(undefined)
              }}
            />
          ) : (
            <CodeInput
              id="code"
              autoFocus
              // Móvil: el teclado ofrece el código recién llegado
              autoComplete="one-time-code"
              aria-invalid={Boolean(errorCampo)}
              value={codigo}
              onValueChange={(valor) => {
                setCodigo(valor)
                setErrorCampo(undefined)
                // Con la app, seis cifras bastan: se comprueba solo
                if (via === 'app' && valor.length === 6 && !enviando)
                  void verificar(valor)
              }}
            />
          )}
          <FieldError message={errorCampo} />
        </div>

        <SubmitConEspera
          espera={espera}
          isSubmitting={enviando}
          disabled={!completo}
          label="Confirmar"
        />
      </form>

      <div className="text-muted-foreground space-y-2 text-center text-sm">
        {via === 'app' && (
          <p>
            ¿No tiene el teléfono?{' '}
            <Button
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => cambiarVia('respaldo')}
            >
              Use un código de respaldo
            </Button>
          </p>
        )}
        {via === 'respaldo' && (
          <p>
            <Button
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => cambiarVia('app')}
            >
              Volver a la app autenticadora
            </Button>
          </p>
        )}
        <p>
          {via === 'correo' ? '¿No ha llegado?' : '¿Otra cuenta?'}{' '}
          <Button variant="link" className="h-auto p-0 text-sm" onClick={onCancelar}>
            Vuelva a iniciar sesión
          </Button>
        </p>
      </div>
    </div>
  )
}
