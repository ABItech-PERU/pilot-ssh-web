import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CodeInput } from '@/components/code-input'
import { Label } from '@/components/ui/label'
import { AccountEmailDialog } from '@/features/account/AccountEmailDialog'
import type { useConfirmarCorreo } from '@/features/account/use-confirmar-correo'
import { useSession } from '@/features/auth/session'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'

const ENLACE =
  'text-foreground focus-visible:outline-ring font-medium underline underline-offset-2 focus-visible:-outline-offset-2 focus-visible:outline-1'

interface Props {
  id: string
  codigo: string
  onCodigo: (codigo: string) => void
  pedir: ReturnType<typeof useConfirmarCorreo>['pedir']
  autoFocus?: boolean
}

/** Código, tiempo restante y dos salidas si no llega: pedir otro o
 *  corregir el correo mal tecleado. */
export function EmailCodeField({ id, codigo, onCodigo, pedir, autoFocus }: Props) {
  const { user } = useSession()
  const { remaining, isRunning, start } = useCountdown()
  const vence = user?.email_code_expires_at ?? null

  // El reloj sigue el vencimiento del código vigente
  useEffect(() => {
    if (vence) start(segundosHasta(vence))
  }, [vence, start])

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Código de seis dígitos</Label>
      <CodeInput id={id} autoFocus={autoFocus} value={codigo} onValueChange={onCodigo} />
      <p className="text-muted-foreground text-xs">
        {isRunning
          ? `Vence en ${formatCountdown(remaining)}. ¿No le llegó?`
          : '¿Venció o no le llegó?'}{' '}
        <button
          type="button"
          disabled={pedir.isPending}
          onClick={() =>
            pedir.mutate(undefined, {
              onSuccess: () => toast.success('Le enviamos otro código.'),
            })
          }
          className={ENLACE}
        >
          Reenviar código
        </button>
      </p>
      <WrongEmailLink />
    </div>
  )
}

/** Correo mal tecleado: cambiarlo envía el código a la dirección buena, y
 *  confirmarlo la deja verificada. */
export function WrongEmailLink() {
  const [cambiando, setCambiando] = useState(false)

  return (
    <>
      <p className="text-muted-foreground text-xs">
        ¿No es su correo?{' '}
        <button type="button" onClick={() => setCambiando(true)} className={ENLACE}>
          Cambiarlo
        </button>
      </p>
      <AccountEmailDialog open={cambiando} onOpenChange={setCambiando} />
    </>
  )
}

function segundosHasta(instante: string): number {
  return Math.max(0, Math.ceil((new Date(instante).getTime() - Date.now()) / 1000))
}
