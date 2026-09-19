import { AlertCircleIcon, Loader2Icon, MailIcon } from 'lucide-react'
import { useState } from 'react'

import { FormDialogContent } from '@/components/form-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmailCodeField, WrongEmailLink } from '@/features/account/EmailCodeField'
import {
  codigoVigente,
  useConfirmarCorreo,
  useRegaloAlConfirmar,
} from '@/features/account/use-confirmar-correo'
import { useSession } from '@/features/auth/session'

interface Props {
  email: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Para quien se saltó el paso del alta o dejó vencer el código. Con el
 *  código vigente se escribe directo; vencido, se pide otro. */
export function EmailVerificationDialog({ email, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        {/* Dentro del contenido: se desmonta al cerrar y, al reabrir,
            vuelve a comprobar si el código sigue vigente */}
        <FormularioDeCorreo email={email} onCerrar={() => onOpenChange(false)} />
      </FormDialogContent>
    </Dialog>
  )
}

function FormularioDeCorreo({
  email,
  onCerrar,
}: {
  email: string
  onCerrar: () => void
}) {
  const { user } = useSession()
  const [codigo, setCodigo] = useState('')
  // Se decide al abrir; si vence mientras se escribe, lo avisa el campo
  const [enviado, setEnviado] = useState(() =>
    codigoVigente(user?.email_code_expires_at ?? null),
  )
  const { pedir, confirmar, aviso, limpiarAviso } = useConfirmarCorreo(onCerrar)
  const regalo = useRegaloAlConfirmar()

  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirme su correo</DialogTitle>
        <DialogDescription>
          {enviado
            ? `Introduzca el código que le enviamos a ${email}.`
            : `Al confirmarlo recibe ${regalo}.`}
        </DialogDescription>
      </DialogHeader>

      {aviso && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}

      {enviado ? (
        <EmailCodeField
          id="codigo-del-correo"
          autoFocus
          codigo={codigo}
          onCodigo={(valor) => {
            setCodigo(valor)
            limpiarAviso()
          }}
          pedir={pedir}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <MailIcon className="size-4 shrink-0" />
            <span className="font-machine text-foreground truncate">{email}</span>
          </p>
          <WrongEmailLink />
        </div>
      )}

      <DialogFooter>
        {enviado ? (
          <Button
            key="confirmar"
            type="button"
            disabled={codigo.length < 6 || confirmar.isPending}
            onClick={() => confirmar.mutate(codigo)}
          >
            {confirmar.isPending && <Loader2Icon className="animate-spin" />}
            Confirmar
          </Button>
        ) : (
          <Button
            key="enviar"
            type="button"
            disabled={pedir.isPending}
            onClick={() => pedir.mutate(undefined, { onSuccess: () => setEnviado(true) })}
          >
            {pedir.isPending && <Loader2Icon className="animate-spin" />}
            Enviar código
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
      </DialogFooter>
    </>
  )
}
