import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { NumberInput } from '@/components/number-input'
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
import * as platformApi from '@/features/backoffice/api'
import { toApiError } from '@/lib/api-error'
import { formatCredits } from '@/lib/format'

interface Props {
  /** Vigente. Null mientras carga. */
  valor: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Valor del crédito para los paquetes nuevos. Los creados no cambian:
 *  alterarían lo que un cliente ve a medio pagar. */
export function CreditPriceDialog({ valor, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // Sin ceros de relleno: «0,0100» se lee como cien
    setPrecio(valor === null ? '' : String(Number(valor)))
    setError(undefined)
    setAviso(null)
  }, [open, valor])

  const guardar = useMutation({
    mutationFn: () => platformApi.updateCreditPrice(precio.trim()),
    onSuccess: async () => {
      await platformApi.invalidarPlataforma(cliente)
      onOpenChange(false)
      toast.success('Valor del crédito guardado.')
    },
    onError: (fallo) => {
      const error = toApiError(fallo)
      setError(error.fieldErrors.credit_unit_price?.[0])
      if (!error.hasFieldErrors) setAviso(error.message)
    },
  })

  // Créditos por S/ 100: así se entiende el unitario
  const porCien = Number(precio) > 0 ? 100 / Number(precio) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Valor del crédito</DialogTitle>
          <DialogDescription>
            Rige los paquetes nuevos. Los creados no cambian.
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="valor-credito">Soles por crédito</Label>
          <NumberInput
            id="valor-credito"
            inputMode="decimal"
            min={0.0001}
            step="0.0001"
            autoFocus
            value={precio}
            aria-invalid={Boolean(error)}
            onChange={(evento) => {
              setPrecio(evento.target.value)
              setError(undefined)
            }}
          />
          {error ? (
            <FieldError message={error} />
          ) : (
            <p className="text-muted-foreground text-xs">
              {porCien > 0
                ? `S/ 100 darían ${formatCredits(porCien)} créditos de base.`
                : 'Los créditos base de cada paquete salen de este valor.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={precio.trim() === '' || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            Guardar el valor
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
