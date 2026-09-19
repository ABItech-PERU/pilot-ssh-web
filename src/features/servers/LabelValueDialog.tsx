import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ColorPicker } from '@/components/color-picker'
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
import { COLOR_POR_DEFECTO, NOMBRES, resolveColor } from '@/lib/palette'
import type { LabelDefinition, PaletteColor } from '@/types/api'

/** Primer color libre de la paleta: dos opciones iguales no se distinguen. */
function elegirColor(etiqueta: LabelDefinition): PaletteColor {
  const usados = new Set(Object.values(etiqueta.colors))
  return NOMBRES.find((nombre) => !usados.has(nombre)) ?? COLOR_POR_DEFECTO
}

interface Props {
  etiqueta: LabelDefinition
  /** `null`: añade una. */
  opcion: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Renombrar actualiza donde esté asignada: no corta accesos. El color
 *  también se cambia desde la fila, con la misma petición. */
export function LabelValueDialog({ etiqueta, opcion, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [texto, setTexto] = useState('')
  const [color, setColor] = useState<PaletteColor>(COLOR_POR_DEFECTO)
  const [aviso, setAviso] = useState<string | null>(null)
  const edita = Boolean(opcion)

  useEffect(() => {
    if (!open) return
    setTexto(opcion ?? '')
    setColor(opcion ? resolveColor(etiqueta.colors[opcion]) : elegirColor(etiqueta))
    setAviso(null)
  }, [open, opcion, etiqueta])

  const nombre = texto.trim()
  const haCambiado =
    nombre !== '' &&
    (opcion === null ||
      nombre !== opcion ||
      color !== resolveColor(etiqueta.colors[opcion]))

  const guardar = useMutation({
    mutationFn: async () => {
      if (opcion) {
        return serversApi.updateLabelValue(etiqueta.id, opcion, {
          nuevo: nombre === opcion ? undefined : nombre,
          color,
        })
      }
      return serversApi.addLabelValue(etiqueta.id, nombre, color)
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['label-definitions'] })
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      onOpenChange(false)
      toast.success(edita ? 'Opción guardada.' : 'Opción añadida.')
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(
        fallo.fieldErrors.new_value?.[0] ?? fallo.fieldErrors.value?.[0] ?? fallo.message,
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edita ? `Opción ${opcion}` : 'Nueva opción'}</DialogTitle>
          <DialogDescription>
            {edita
              ? 'Se cambia también donde ya esté puesta.'
              : `Se añade a ${etiqueta.key}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="texto-de-la-opcion">Nombre</Label>
          <Input
            id="texto-de-la-opcion"
            autoComplete="off"
            autoFocus
            aria-invalid={Boolean(aviso)}
            aria-describedby="pista-opcion"
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value)
              setAviso(null)
            }}
            onKeyDown={(evento) => {
              if (evento.key !== 'Enter' || !haCambiado) return
              evento.preventDefault()
              guardar.mutate()
            }}
          />
          {aviso ? (
            <FieldError message={aviso} />
          ) : (
            <p id="pista-opcion" className="text-muted-foreground text-xs">
              Se escribe como se lee en pantalla, con mayúsculas y tildes.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <ColorPicker
            color={color}
            descripcion="Color de la opción"
            onChange={setColor}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={!haCambiado || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {edita ? 'Guardar cambios' : 'Añadir opción'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
