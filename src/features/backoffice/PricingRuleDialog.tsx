import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { InfoHint } from '@/components/info-hint'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NumberInput } from '@/components/number-input'
import { Label } from '@/components/ui/label'
import * as platformApi from '@/features/backoffice/api'
import { RECURSOS } from '@/features/credits/tarifas'
import { toApiError } from '@/lib/api-error'
import type { PlatformPricingRule } from '@/types/api'

interface Props {
  tarifa: PlatformPricingRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Errores {
  credits_per_day?: string
  free_allowance?: string
}

/** Precio diario de un recurso y cuántos van gratis. */
export function PricingRuleDialog({ tarifa, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [porDia, setPorDia] = useState('')
  const [gratis, setGratis] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !tarifa) return
    setPorDia(String(Number(tarifa.credits_per_day)))
    setGratis(String(tarifa.free_allowance))
    setErrores({})
    setAviso(null)
  }, [open, tarifa])

  const guardar = useMutation({
    mutationFn: () =>
      platformApi.updatePricing(tarifa!.resource, {
        credits_per_day: porDia.trim(),
        free_allowance: Number(gratis),
      }),
    onSuccess: async () => {
      await platformApi.invalidarPlataforma(cliente)
      onOpenChange(false)
      toast.success('Tarifa guardada. Rige desde mañana.')
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setErrores({
        credits_per_day: fallo.fieldErrors.credits_per_day?.[0],
        free_allowance: fallo.fieldErrors.free_allowance?.[0],
      })
      if (!fallo.hasFieldErrors) setAviso(fallo.message)
    },
  })

  const listo = porDia.trim() !== '' && gratis.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar la tarifa</DialogTitle>
          <DialogDescription>
            {tarifa ? RECURSOS[tarifa.resource].etiqueta : ''}. Rige desde el día
            siguiente.
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="creditos-por-dia">Créditos por día de uso</Label>
            <NumberInput
              id="creditos-por-dia"
              inputMode="decimal"
              min={0}
              step="1"
              autoFocus
              value={porDia}
              aria-invalid={Boolean(errores.credits_per_day)}
              onChange={(evento) => {
                setPorDia(evento.target.value)
                setErrores((actuales) => ({ ...actuales, credits_per_day: undefined }))
              }}
            />
            <FieldError message={errores.credits_per_day} />
          </div>
          <div className="space-y-2">
            {/* Explicación tras el icono: bajo el campo desalinearía las
                columnas y parecería un aviso */}
            <div className="flex items-center gap-1.5">
              <Label htmlFor="gratis-por-dia">Gratis cada día</Label>
              {tarifa && (
                <InfoHint etiqueta="Qué es lo gratuito de cada día">
                  {RECURSOS[tarifa.resource].ayudaGratis}
                </InfoHint>
              )}
            </div>
            <NumberInput
              id="gratis-por-dia"
              inputMode="numeric"
              min={0}
              step="1"
              value={gratis}
              aria-invalid={Boolean(errores.free_allowance)}
              onChange={(evento) => {
                setGratis(evento.target.value)
                setErrores((actuales) => ({ ...actuales, free_allowance: undefined }))
              }}
            />
            <FieldError message={errores.free_allowance} />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!listo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            Guardar la tarifa
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
