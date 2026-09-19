import { useMutation } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'

import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { SelectorDeZona } from '@/components/selector-de-zona'
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
import { Textarea } from '@/components/ui/textarea'
import * as platformApi from '@/features/backoffice/api'
import { toApiError } from '@/lib/api-error'
import type { PlatformAccountDetail } from '@/types/api'

interface Props {
  cuenta: PlatformAccountDetail
  onCerrar: () => void
  onCambiada: (cuenta: PlatformAccountDetail) => void
}

/** Rige desde el próximo día cobrado; lo cobrado no se recalcula. Solo se
 *  monta abierto: empieza limpio. */
export function BillingZoneDialog({ cuenta, onCerrar, onCambiada }: Props) {
  const [zona, setZona] = useState(cuenta.billing_time_zone)
  const [motivo, setMotivo] = useState('')

  const cambiar = useMutation({
    mutationFn: () => platformApi.changeBillingZone(cuenta.id, zona, motivo.trim()),
    onSuccess: onCambiada,
  })

  const error = cambiar.error ? toApiError(cambiar.error) : null
  const errorDelMotivo = error?.fieldErrors.reason?.[0]
  const errorDeLaZona = error?.fieldErrors.time_zone?.[0]
  const puedeGuardar =
    zona !== cuenta.billing_time_zone && motivo.trim() !== '' && !cambiar.isPending

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <FormDialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar la zona de cobro de {cuenta.display_name}</DialogTitle>
          <DialogDescription>
            Corta el día de cobro de todas sus organizaciones. Rige desde el próximo día
            que se cobre; lo ya cobrado no cambia.
          </DialogDescription>
        </DialogHeader>

        {error && !errorDelMotivo && !errorDeLaZona && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <SelectorDeZona
          elegida={zona}
          onElegir={setZona}
          centrada={cuenta.billing_time_zone}
          sugeridas={[{ nombre: cuenta.billing_time_zone, motivo: 'Actual' }]}
        />
        {errorDeLaZona && <FieldError message={errorDeLaZona} />}

        <div className="space-y-2">
          <Label htmlFor="motivo-de-la-zona">Motivo</Label>
          <Textarea
            id="motivo-de-la-zona"
            rows={2}
            maxLength={255}
            value={motivo}
            aria-invalid={Boolean(errorDelMotivo)}
            aria-describedby="pista-de-la-zona"
            onChange={(evento) => setMotivo(evento.target.value)}
          />
          {errorDelMotivo ? (
            <FieldError message={errorDelMotivo} />
          ) : (
            <p id="pista-de-la-zona" className="text-muted-foreground text-xs">
              Lo verá en la actividad de su cuenta.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button disabled={!puedeGuardar} onClick={() => cambiar.mutate()}>
            {cambiar.isPending && <Loader2Icon className="animate-spin" />}
            Cambiar zona
          </Button>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
