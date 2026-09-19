import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, MailIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CodeInput } from '@/components/code-input'
import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** En dos tiempos: el código llega al correo nuevo y, hasta confirmarlo,
 *  vale el anterior. Un error al teclear no deja a nadie fuera. */
export function AccountEmailDialog({ open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCorreo('')
      setClave('')
      setCodigo('')
      setEnviadoA(null)
      setAviso(null)
    }
  }, [open])

  const pedir = useMutation({
    mutationFn: () =>
      authApi.requestEmailChange({ email: correo.trim(), current_password: clave }),
    onSuccess: (datos) => {
      setEnviadoA(datos.email)
      setAviso(null)
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(
        fallo.fieldErrors.email?.[0] ??
          fallo.fieldErrors.current_password?.[0] ??
          fallo.message,
      )
    },
  })

  const confirmar = useMutation({
    mutationFn: () => authApi.confirmEmailChange(codigo),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success('Correo actualizado.')
      onOpenChange(false)
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const pendiente = pedir.isPending || confirmar.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar el correo</DialogTitle>
          <DialogDescription>
            {enviadoA
              ? 'Introduzca el código de seis dígitos que acaba de recibir.'
              : 'Es el correo con el que se inicia sesión.'}
          </DialogDescription>
        </DialogHeader>

        {enviadoA ? (
          <>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <MailIcon className="size-4 shrink-0" />
              <span className="font-machine text-foreground truncate">{enviadoA}</span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="codigo-correo">Código de verificación</Label>
              <CodeInput
                id="codigo-correo"
                autoFocus
                value={codigo}
                aria-invalid={Boolean(aviso)}
                onValueChange={(valor) => {
                  setCodigo(valor)
                  setAviso(null)
                }}
              />
              <FieldError message={aviso ?? undefined} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="correo-nuevo">Correo nuevo</Label>
              <Input
                id="correo-nuevo"
                type="email"
                autoComplete="off"
                autoFocus
                placeholder="nombre@correo.com"
                value={correo}
                aria-invalid={Boolean(aviso)}
                onChange={(evento) => {
                  setCorreo(evento.target.value)
                  setAviso(null)
                }}
              />
              <p className="text-muted-foreground text-xs">
                Se enviará un código a esa dirección para confirmarla.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clave-correo">Contraseña actual</Label>
              <PasswordInput
                id="clave-correo"
                autoComplete="off"
                value={clave}
                aria-invalid={Boolean(aviso)}
                onChange={(evento) => {
                  setClave(evento.target.value)
                  setAviso(null)
                }}
              />
              <FieldError message={aviso ?? undefined} />
            </div>
          </>
        )}

        <DialogFooter>
          {enviadoA ? (
            <Button
              disabled={codigo.length < 6 || pendiente}
              onClick={() => confirmar.mutate()}
            >
              {confirmar.isPending && <Loader2Icon className="animate-spin" />}
              Confirmar
            </Button>
          ) : (
            <Button
              disabled={correo.trim().length === 0 || clave.length === 0 || pendiente}
              onClick={() => pedir.mutate()}
            >
              {pedir.isPending && <Loader2Icon className="animate-spin" />}
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
