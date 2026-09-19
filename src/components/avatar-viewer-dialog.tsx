import { FormDialogContent } from '@/components/form-dialog'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  imagen: string
  titulo: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** La imagen a tamaño completo, para comprobar lo que se subió. */
export function AvatarViewerDialog({ imagen, titulo, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className="sr-only">
            La imagen que se ve en la barra lateral, a tamaño completo.
          </DialogDescription>
        </DialogHeader>
        <img
          src={imagen}
          alt=""
          className="mx-auto aspect-square w-full rounded-xl object-cover"
        />
      </FormDialogContent>
    </Dialog>
  )
}
