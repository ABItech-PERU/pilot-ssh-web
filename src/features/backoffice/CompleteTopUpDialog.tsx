import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
import * as platformApi from '@/features/backoffice/api'
import {
  CamposDelCobro,
  type ErroresDelCobro,
} from '@/features/backoffice/CamposDelCobro'
import { toApiError } from '@/lib/api-error'
import { formatCredits, formatPrice } from '@/lib/format'
import type { PaymentMethod, PlatformTopUp } from '@/types/api'

interface Props {
  solicitud: PlatformTopUp | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QUE_PASA = [
  'Los créditos entran al saldo de inmediato.',
  'Quien la pidió recibe un correo.',
  'Queda en la auditoría de la organización con su nombre.',
]

/** Acredita una recarga cobrada por fuera. Exige el medio; operación y
 *  comprobante pueden llegar después, sin retener los créditos. */
export function CompleteTopUpDialog({ solicitud, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [metodo, setMetodo] = useState<PaymentMethod | ''>('')
  const [referencia, setReferencia] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errores, setErrores] = useState<ErroresDelCobro>({})
  const [aviso, setAviso] = useState<string | null>(null)
  // Fija lo mostrado: el título conserva el nombre durante el cierre
  const [mostrada, setMostrada] = useState(solicitud)

  useEffect(() => {
    if (!open) return
    setMostrada(solicitud)
    setMetodo('')
    setReferencia('')
    setArchivo(null)
    setErrores({})
    setAviso(null)
  }, [open, solicitud])

  const acreditar = useMutation({
    mutationFn: () =>
      platformApi.completeTopUp(mostrada!.id, {
        method: metodo as PaymentMethod,
        reference: referencia.trim(),
        receipt: archivo,
      }),
    onSuccess: async (recarga) => {
      await platformApi.invalidarPlataforma(cliente)
      onOpenChange(false)
      toast.success(
        `${formatCredits(recarga.credits)} créditos acreditados a ${recarga.organization.name}.`,
      )
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrores({
        method: fallo.fieldErrors.method?.[0],
        reference: fallo.fieldErrors.reference?.[0],
        receipt: fallo.fieldErrors.receipt?.[0],
      })
      if (!fallo.hasFieldErrors) setAviso(fallo.message)
    },
  })

  const importe = mostrada && formatPrice(mostrada.price_amount, mostrada.price_currency)
  // Abandonada en línea: acreditarla es raro, y el aviso lo dice
  const abandonada = Boolean(mostrada?.gateway)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Acreditar la recarga</DialogTitle>
          <DialogDescription>
            {mostrada &&
              `${mostrada.organization.name} recibe ${formatCredits(mostrada.credits)} créditos por ${mostrada.package_name} (${importe}). Hágalo solo si ya cobró por fuera.`}
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        {abandonada && (
          <Alert>
            <TriangleAlertIcon />
            <AlertDescription>
              Se pidió en línea y no hay pago registrado. Acredítela solo si el cliente
              pagó por fuera.
            </AlertDescription>
          </Alert>
        )}

        <CamposDelCobro
          prefijo="acreditar"
          reparto="dos-columnas"
          metodo={metodo}
          onMetodo={(valor) => {
            setMetodo(valor)
            setErrores((actuales) => ({ ...actuales, method: undefined }))
          }}
          referencia={referencia}
          onReferencia={(valor) => {
            setReferencia(valor)
            setErrores((actuales) => ({ ...actuales, reference: undefined }))
          }}
          archivo={archivo}
          onArchivo={(elegido) => {
            setArchivo(elegido)
            setErrores((actuales) => ({ ...actuales, receipt: undefined }))
          }}
          errores={errores}
        />

        <div className="bg-muted/40 rounded-lg border p-4 text-sm">
          <p className="font-medium">Qué pasa</p>
          <ul className="text-muted-foreground mt-2 grid gap-1.5 sm:grid-cols-2">
            {QUE_PASA.map((detalle) => (
              <li key={detalle} className="flex gap-2">
                <span className="text-foreground" aria-hidden>
                  &bull;
                </span>
                {detalle}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button
            disabled={metodo === '' || acreditar.isPending}
            onClick={() => acreditar.mutate()}
          >
            {acreditar.isPending && <Loader2Icon className="animate-spin" />}
            Acreditar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
