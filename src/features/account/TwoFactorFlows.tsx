import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  CheckIcon,
  KeyRoundIcon,
  Loader2Icon,
  MailIcon,
  ShieldOffIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { CodeInput } from '@/components/code-input'
import { FieldError } from '@/components/field-error'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RecoveryCodes } from '@/features/account/RecoveryCodes'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'

function Encabezado({
  icono: Icono,
  tono = 'primario',
  titulo,
  descripcion,
}: {
  icono: React.ElementType
  tono?: 'primario' | 'peligro'
  titulo: string
  descripcion: React.ReactNode
}) {
  return (
    <DialogHeader className="space-y-3">
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full',
          tono === 'peligro'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Icono className="size-5" />
      </span>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogDescription>{descripcion}</DialogDescription>
    </DialogHeader>
  )
}

function CampoDeClave({
  id,
  valor,
  error,
  onCambiar,
}: {
  id: string
  valor: string
  error?: string
  onCambiar: (valor: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Contraseña actual</Label>
      <PasswordInput
        id={id}
        autoComplete="current-password"
        autoFocus
        value={valor}
        aria-invalid={Boolean(error)}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
      <FieldError message={error} />
    </div>
  )
}

/** En dos tiempos: llega el código y se comprueba. Sin comprobar que el
 *  correo llega, el dueño podría quedar fuera. */
export function EmailTwoFactorSetup({
  correo,
  onVolver,
  onListo,
}: {
  correo: string
  onVolver: () => void
  onListo: () => void
}) {
  const cliente = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const pedirCodigo = useMutation({
    mutationFn: authApi.requestTwoFactorCode,
    onSuccess: () => {
      setEnviado(true)
      setError(undefined)
    },
    onError: (fallo) => setError(toApiError(fallo).message),
  })

  const activar = useMutation({
    mutationFn: () => authApi.enableTwoFactor(codigo),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success('Verificación por correo activada.')
      onListo()
    },
    onError: (fallo) => {
      const api = toApiError(fallo)
      setError(api.fieldErrors.code?.[0] ?? api.message)
    },
  })

  return (
    <>
      <Encabezado
        icono={MailIcon}
        titulo="Código por correo"
        descripcion={
          enviado ? (
            <>
              Escriba el código de seis dígitos que enviamos a{' '}
              <span className="text-foreground font-medium">{correo}</span>.
            </>
          ) : (
            <>
              Cada inicio de sesión pedirá un código enviado a{' '}
              <span className="text-foreground font-medium">{correo}</span>. Antes,
              comprobamos que llega.
            </>
          )
        }
      />

      {enviado ? (
        <div className="space-y-2">
          <Label htmlFor="codigo-correo">Código del correo</Label>
          <CodeInput
            id="codigo-correo"
            autoFocus
            value={codigo}
            aria-invalid={Boolean(error)}
            onValueChange={(valor) => {
              setCodigo(valor)
              setError(undefined)
            }}
          />
          <FieldError message={error} />
        </div>
      ) : (
        <FieldError message={error} />
      )}

      <DialogFooter>
        {enviado ? (
          <Button
            disabled={codigo.length < 6 || activar.isPending}
            onClick={() => activar.mutate()}
          >
            {activar.isPending && <Loader2Icon className="animate-spin" />}
            Activar
          </Button>
        ) : (
          <Button disabled={pedirCodigo.isPending} onClick={() => pedirCodigo.mutate()}>
            {pedirCodigo.isPending && <Loader2Icon className="animate-spin" />}
            Enviar código
          </Button>
        )}
        <Button variant="outline" onClick={onVolver}>
          Volver
        </Button>
      </DialogFooter>
    </>
  )
}

/** Con la contraseña; los anteriores dejan de servir al instante. */
export function RecoveryCodesRenewal({
  correo,
  onVolver,
  onBloquear,
  onListo,
}: {
  correo: string
  onVolver: () => void
  onBloquear: (bloqueado: boolean) => void
  onListo: () => void
}) {
  const cliente = useQueryClient()
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [codigos, setCodigos] = useState<string[] | null>(null)
  const [guardados, setGuardados] = useState(false)

  const generar = useMutation({
    mutationFn: () => authApi.regenerateRecoveryCodes(clave),
    onSuccess: async ({ recovery_codes }) => {
      setCodigos(recovery_codes)
      onBloquear(true)
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
    },
    onError: (fallo) => {
      const api = toApiError(fallo)
      setError(api.fieldErrors.current_password?.[0] ?? api.message)
    },
  })

  if (codigos) {
    return (
      <>
        <Encabezado
          icono={KeyRoundIcon}
          titulo="Guarde sus códigos nuevos"
          descripcion="Los anteriores ya no sirven. Estos no se volverán a mostrar."
        />
        <RecoveryCodes
          codigos={codigos}
          correo={correo}
          guardados={guardados}
          onGuardados={setGuardados}
        />
        <DialogFooter>
          <Button
            disabled={!guardados}
            onClick={() => {
              onBloquear(false)
              onListo()
            }}
          >
            <CheckIcon />
            Listo
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <Encabezado
        icono={KeyRoundIcon}
        titulo="Generar códigos nuevos"
        descripcion="Los diez anteriores dejarán de servir, también los que no usó."
      />
      <form
        id="respaldos-nuevos"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          generar.mutate()
        }}
      >
        <CampoDeClave
          id="clave-respaldos"
          valor={clave}
          error={error}
          onCambiar={(valor) => {
            setClave(valor)
            setError(undefined)
          }}
        />
      </form>
      <DialogFooter>
        <Button
          type="submit"
          form="respaldos-nuevos"
          disabled={clave.length === 0 || generar.isPending}
        >
          {generar.isPending && <Loader2Icon className="animate-spin" />}
          Generar
        </Button>
        <Button variant="outline" onClick={onVolver}>
          Volver
        </Button>
      </DialogFooter>
    </>
  )
}

/** Exige la contraseña: protege ante un equipo desbloqueado ajeno. */
export function TwoFactorDisable({
  conApp,
  esPersonal,
  onVolver,
  onListo,
}: {
  conApp: boolean
  esPersonal: boolean
  onVolver: () => void
  onListo: () => void
}) {
  const cliente = useQueryClient()
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | undefined>()

  const desactivar = useMutation({
    mutationFn: () => authApi.disableTwoFactor(clave),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success('Verificación en dos pasos desactivada.')
      onListo()
    },
    onError: (fallo) => {
      const api = toApiError(fallo)
      setError(api.fieldErrors.current_password?.[0] ?? api.message)
    },
  })

  const perdidas = [
    'Los inicios de sesión pedirán solo la contraseña.',
    'Quien la consiga entrará sin más.',
    ...(conApp ? ['Se borran la app vinculada y sus códigos de respaldo.'] : []),
    ...(esPersonal ? ['No podrá entrar al panel de la plataforma.'] : []),
  ]

  return (
    <>
      <Encabezado
        icono={ShieldOffIcon}
        tono="peligro"
        titulo="Desactivar la verificación en dos pasos"
        descripcion="Escriba su contraseña para confirmar que es usted quien lo pide."
      />

      <ul className="border-destructive/25 bg-destructive/5 text-muted-foreground space-y-1.5 rounded-lg border p-4 text-sm">
        {perdidas.map((perdida) => (
          <li key={perdida} className="flex gap-2">
            <span aria-hidden className="text-destructive">
              &bull;
            </span>
            {perdida}
          </li>
        ))}
      </ul>

      <form
        id="desactivar-dos-pasos"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          desactivar.mutate()
        }}
      >
        <CampoDeClave
          id="clave-dos-pasos"
          valor={clave}
          error={error}
          onCambiar={(valor) => {
            setClave(valor)
            setError(undefined)
          }}
        />
      </form>

      <DialogFooter>
        <Button
          type="submit"
          form="desactivar-dos-pasos"
          variant="destructive"
          disabled={clave.length === 0 || desactivar.isPending}
        >
          {desactivar.isPending && <Loader2Icon className="animate-spin" />}
          Desactivar
        </Button>
        <Button variant="outline" onClick={onVolver}>
          Volver
        </Button>
      </DialogFooter>
    </>
  )
}
