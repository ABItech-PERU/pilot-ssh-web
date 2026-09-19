import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon, MailIcon, ShieldOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CodeInput } from '@/components/code-input'
import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO, useSession } from '@/features/auth/session'
import { esPersonal } from '@/features/backoffice/permisos'
import { toApiError } from '@/lib/api-error'

interface Props {
  email: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** En dos tiempos: llega el código y se comprueba. Sin comprobar que el
 *  correo llega, el dueño podría quedar fuera. */
export function TwoFactorEnableDialog({ email, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCodigo('')
      setEnviado(false)
      setAviso(null)
    }
  }, [open])

  const pedirCodigo = useMutation({
    mutationFn: authApi.requestTwoFactorCode,
    onSuccess: () => {
      setEnviado(true)
      setAviso(null)
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const activar = useMutation({
    mutationFn: () => authApi.enableTwoFactor(codigo),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success('Verificación en dos pasos activada.')
      onOpenChange(false)
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const pendiente = pedirCodigo.isPending || activar.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activar la verificación en dos pasos</DialogTitle>
          <DialogDescription>
            {enviado
              ? 'Introduzca el código de seis dígitos que acaba de recibir.'
              : 'Cada inicio de sesión pedirá un código enviado al correo de la cuenta.'}
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        {enviado ? (
          <div className="space-y-2">
            <Label htmlFor="two-factor-code">Código de verificación</Label>
            <CodeInput
              id="two-factor-code"
              autoFocus
              value={codigo}
              onValueChange={(valor) => {
                setCodigo(valor)
                setAviso(null)
              }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <MailIcon className="size-4 shrink-0" />
            <span className="font-machine text-foreground truncate">{email}</span>
          </p>
        )}

        <DialogFooter>
          {enviado ? (
            <Button
              disabled={codigo.length < 6 || pendiente}
              onClick={() => activar.mutate()}
            >
              {activar.isPending && <Loader2Icon className="animate-spin" />}
              Activar
            </Button>
          ) : (
            <Button disabled={pendiente} onClick={() => pedirCodigo.mutate()}>
              {pedirCodigo.isPending && <Loader2Icon className="animate-spin" />}
              Enviar código
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

/** Exige la contraseña: protege ante un equipo desbloqueado ajeno. */
export function TwoFactorDisableDialog({ open, onOpenChange }: Omit<Props, 'email'>) {
  const cliente = useQueryClient()
  const { user } = useSession()
  const [clave, setClave] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setClave('')
      setAviso(null)
    }
  }, [open])

  const desactivar = useMutation({
    mutationFn: () => authApi.disableTwoFactor(clave),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success('Verificación en dos pasos desactivada.')
      onOpenChange(false)
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(fallo.fieldErrors.current_password?.[0] ?? fallo.message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <span className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-full">
            <ShieldOffIcon className="size-5" />
          </span>
          <DialogTitle>Desactivar la verificación en dos pasos</DialogTitle>
          <DialogDescription>
            Escriba su contraseña para confirmar que es usted quien lo pide.
          </DialogDescription>
        </DialogHeader>

        <div className="border-destructive/25 bg-destructive/5 rounded-lg border p-4 text-sm">
          <p className="font-medium">Qué cambia</p>
          <ul className="text-muted-foreground mt-2 space-y-1.5">
            <li className="flex gap-2">
              <span aria-hidden className="text-destructive">
                &bull;
              </span>
              Los inicios de sesión pedirán solo la contraseña.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-destructive">
                &bull;
              </span>
              Quien la consiga entrará sin pasar por el correo.
            </li>
            {esPersonal(user) && (
              <li className="flex gap-2">
                <span aria-hidden className="text-destructive">
                  &bull;
                </span>
                No podrá entrar al panel de la plataforma.
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clave-dos-pasos">Contraseña actual</Label>
          <PasswordInput
            id="clave-dos-pasos"
            autoComplete="off"
            autoFocus
            value={clave}
            aria-invalid={Boolean(aviso)}
            onChange={(evento) => {
              setClave(evento.target.value)
              setAviso(null)
            }}
          />
          <FieldError message={aviso ?? undefined} />
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={clave.length === 0 || desactivar.isPending}
            onClick={() => desactivar.mutate()}
          >
            {desactivar.isPending && <Loader2Icon className="animate-spin" />}
            Desactivar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
