import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as organizationsApi from '@/features/organizations/api'
import {
  aplicarPlantilla,
  ETIQUETAS_POR_DEFECTO,
  LabelTemplateField,
} from '@/features/organizations/LabelTemplateField'
import { setCurrentOrganizationSlug } from '@/features/organizations/current'
import { toApiError } from '@/lib/api-error'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Solo nombre y etiquetas iniciales. La dirección la pone el sistema y se
 *  cambia después en Organización: aquí sería un campo que frena. */
export function OrganizationFormDialog({ open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
  const [etiquetas, setEtiquetas] = useState<string[]>([])
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre('')
    setEtiquetas(ETIQUETAS_POR_DEFECTO)
    setAviso(null)
  }, [open])

  const crear = useMutation({
    mutationFn: async () => {
      // Sin `slug`: lo pone el servidor, numerado si el nombre está tomado
      const creada = await organizationsApi.createOrganization({
        name: nombre.trim(),
      })

      return { creada, fallidas: await aplicarPlantilla(creada.slug, etiquetas) }
    },
    onSuccess: async ({ creada, fallidas }) => {
      // Se entra en la nueva: se crea para trabajar en ella
      setCurrentOrganizationSlug(creada.slug)
      await cliente.invalidateQueries()
      onOpenChange(false)

      if (fallidas.length > 0) {
        toast.error(
          `Ya está trabajando en ${creada.name}. Añada ${fallidas.join(' y ')} desde Equipo.`,
        )
      } else {
        toast.success(`Ya está trabajando en ${creada.name}.`)
      }

      // A servidores: es lo primero que se registra
      navegar('/app/servers')
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear organización</DialogTitle>
          <DialogDescription>
            Un espacio independiente, con sus servidores y su equipo.
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
            <Label htmlFor="nombre-organizacion">Nombre</Label>
            <Input
              id="nombre-organizacion"
              value={nombre}
              autoComplete="off"
              autoFocus
              onChange={(evento) => setNombre(evento.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              El del equipo o el de la empresa.
            </p>
          </div>

          <LabelTemplateField elegidas={etiquetas} onChange={setEtiquetas} />
        </div>

        <DialogFooter>
          <Button
            disabled={!nombre.trim() || crear.isPending}
            onClick={() => crear.mutate()}
          >
            {crear.isPending && <Loader2Icon className="animate-spin" />}
            Crear organización
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
