import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { FieldError } from '@/components/field-error'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ApiError } from '@/lib/api-error'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descripcion: string
  /** Bajo el campo: quién leerá el motivo. */
  pista: string
  accion: string
  destructiva?: boolean
  pendiente: boolean
  error: ApiError | null
  onConfirmar: (motivo: string) => void
}

/** Toda acción del personal sobre un cliente pide motivo: queda en su
 *  auditoría. */
export function ReasonDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  pista,
  accion,
  destructiva = false,
  pendiente,
  error,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (open) setMotivo('')
  }, [open])

  const errorDelCampo = error?.fieldErrors.reason?.[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        {error && !errorDelCampo && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="motivo-del-personal">Motivo</Label>
          <Textarea
            id="motivo-del-personal"
            rows={3}
            maxLength={255}
            autoFocus
            value={motivo}
            aria-invalid={Boolean(errorDelCampo)}
            aria-describedby="pista-del-motivo"
            onChange={(evento) => setMotivo(evento.target.value)}
          />
          {errorDelCampo ? (
            <FieldError message={errorDelCampo} />
          ) : (
            <p id="pista-del-motivo" className="text-muted-foreground text-xs">
              {pista}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant={destructiva ? 'destructive' : 'default'}
            disabled={motivo.trim() === '' || pendiente}
            onClick={() => onConfirmar(motivo.trim())}
          >
            {pendiente && <Loader2Icon className="animate-spin" />}
            {accion}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
