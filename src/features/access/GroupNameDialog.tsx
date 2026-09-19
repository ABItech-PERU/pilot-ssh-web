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
import * as accessApi from '@/features/access/api'
import { toApiError } from '@/lib/api-error'
import type { AccessGroup } from '@/types/api'

interface Props {
  slug: string
  /** Con grupo lo renombra; sin él, crea uno. */
  grupo: AccessGroup | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreado?: (grupo: AccessGroup) => void
}

/** Solo el nombre; miembros y alcance se asignan con el grupo ya creado. */
export function GroupNameDialog({ slug, grupo, open, onOpenChange, onCreado }: Props) {
  const cliente = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre(grupo?.name ?? '')
    setDescripcion(grupo?.description ?? '')
    setAviso(null)
  }, [open, grupo])

  const guardar = useMutation({
    mutationFn: () =>
      grupo
        ? accessApi.renameGroup(grupo.id, {
            name: nombre.trim(),
            description: descripcion.trim(),
          })
        : accessApi.createGroup({
            organization: slug,
            name: nombre.trim(),
            description: descripcion.trim(),
          }),
    onSuccess: async (guardado) => {
      await accessApi.invalidarAcceso(cliente)
      if (!grupo) onCreado?.(guardado)
      onOpenChange(false)
      toast.success(grupo ? 'Grupo guardado.' : `Grupo ${guardado.name} creado.`)
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(fallo.fieldErrors.name?.[0] ?? fallo.message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{grupo ? `Grupo ${grupo.name}` : 'Nuevo grupo'}</DialogTitle>
          <DialogDescription>
            Reúne a quienes entran a los mismos servidores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="nombre-del-grupo">Nombre</Label>
          <Input
            id="nombre-del-grupo"
            autoComplete="off"
            autoFocus
            aria-invalid={Boolean(aviso)}
            aria-describedby="pista-nombre-grupo"
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value)
              setAviso(null)
            }}
          />
          {aviso ? (
            <FieldError message={aviso} />
          ) : (
            <p id="pista-nombre-grupo" className="text-muted-foreground text-xs">
              Por ejemplo, Backend o Producción.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion-del-grupo">Descripción (opcional)</Label>
          <Input
            id="descripcion-del-grupo"
            autoComplete="off"
            placeholder="Para qué es este grupo"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={nombre.trim().length === 0 || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {grupo ? 'Guardar cambios' : 'Crear grupo'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
