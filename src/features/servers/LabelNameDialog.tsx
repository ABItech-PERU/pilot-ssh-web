import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
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
import * as serversApi from '@/features/servers/api'
import { toApiError } from '@/lib/api-error'
import type { LabelDefinition } from '@/types/api'

interface Props {
  slug: string
  /** `null`: crea una. */
  etiqueta: LabelDefinition | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Solo el nombre; las opciones se añaden después desde su fila. */
export function LabelNameDialog({ slug, etiqueta, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre(etiqueta?.key ?? '')
    setAviso(null)
  }, [open, etiqueta])

  const guardar = useMutation({
    mutationFn: async () => {
      if (etiqueta) return serversApi.renameLabel(etiqueta.id, nombre.trim())

      return serversApi.defineLabel({
        organization: slug,
        key: nombre.trim(),
        values: [],
      })
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['label-definitions'] })
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      onOpenChange(false)
      toast.success(etiqueta ? 'Etiqueta guardada.' : 'Etiqueta creada.')
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(
        fallo.fieldErrors.key?.[0] ?? fallo.fieldErrors.values?.[0] ?? fallo.message,
      )
    },
  })

  const listo = nombre.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {etiqueta ? `Etiqueta ${etiqueta.key}` : 'Nueva etiqueta'}
          </DialogTitle>
          <DialogDescription>
            {etiqueta
              ? 'Se cambia también en los servidores y credenciales que la llevan.'
              : 'Sus opciones se añaden después de crearla.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="nombre-de-la-etiqueta">Nombre</Label>
          <Input
            id="nombre-de-la-etiqueta"
            autoComplete="off"
            autoFocus
            placeholder="Entorno"
            aria-invalid={Boolean(aviso)}
            aria-describedby="pista-nombre-etiqueta"
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value)
              setAviso(null)
            }}
          />
          {aviso ? (
            <FieldError message={aviso} />
          ) : (
            <p id="pista-nombre-etiqueta" className="text-muted-foreground text-xs">
              Por ejemplo, Entorno o Cliente.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button disabled={!listo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {etiqueta ? 'Guardar cambios' : 'Crear etiqueta'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
