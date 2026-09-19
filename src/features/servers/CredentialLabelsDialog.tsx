import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
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
import { useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { LabelsField } from '@/features/servers/LabelsField'
import { toApiError } from '@/lib/api-error'
import type { ServerUser } from '@/types/api'

interface Props {
  credential: ServerUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Solo las etiquetas, aparte de «Editar credencial». Para qué sirven se
 *  explica en el catálogo, no aquí. */
export function CredentialLabelsDialog({ credential, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const { slug } = useCurrentOrganization()
  const formulario = useForm<{ labels: Record<string, string> }>({
    defaultValues: { labels: {} },
  })

  useEffect(() => {
    if (!open || !credential) return
    formulario.reset({ labels: credential.labels })
  }, [open, credential, formulario])

  const guardar = useMutation({
    mutationFn: (labels: Record<string, string>) =>
      serversApi.updateCredential(credential!.id, {
        // Etiqueta quitada: en blanco, no viaja
        labels: Object.fromEntries(Object.entries(labels).filter(([, valor]) => valor)),
      }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      onOpenChange(false)
      toast.success('Etiquetas guardadas.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiquetas de {credential?.username}</DialogTitle>
          <DialogDescription>Con qué etiquetas se clasifica.</DialogDescription>
        </DialogHeader>

        <FormProvider {...formulario}>
          <form
            id="formulario-etiquetas-credencial"
            onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos.labels))}
          >
            <LabelsField slug={slug ?? ''} />
          </form>
        </FormProvider>

        {guardar.isError && <FieldError message={toApiError(guardar.error).message} />}

        <DialogFooter>
          <Button
            type="submit"
            form="formulario-etiquetas-credencial"
            disabled={guardar.isPending}
          >
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            Guardar cambios
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
