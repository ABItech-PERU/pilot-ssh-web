import { useEffect, useState } from 'react'

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
import { formatFileSize } from '@/lib/format'

interface DialogoProps {
  archivo: File | null
  carpeta: string
  onConfirmar: (carpeta: string) => void
  onCerrar: () => void
  /** Al salir, el teclado vuelve a la shell, no al botón que abrió esto. */
  onFocoDeVuelta: () => void
}

/** Pregunta dónde dejar el archivo: la copia no sigue al `cd` de la shell. */
export function DialogoDeSubida({
  archivo,
  carpeta,
  onConfirmar,
  onCerrar,
  onFocoDeVuelta,
}: DialogoProps) {
  const [destino, setDestino] = useState(carpeta)

  useEffect(() => {
    if (archivo) setDestino(carpeta)
  }, [archivo, carpeta])

  return (
    <Dialog open={Boolean(archivo)} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <FormDialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(evento) => {
          evento.preventDefault()
          onFocoDeVuelta()
        }}
      >
        <DialogHeader>
          <DialogTitle>Subir al servidor</DialogTitle>
          <DialogDescription>
            {archivo?.name} · {formatFileSize(archivo?.size ?? 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="carpeta-de-destino">Carpeta</Label>
          <Input
            id="carpeta-de-destino"
            autoComplete="off"
            autoFocus
            spellCheck={false}
            className="font-machine"
            aria-describedby="pista-carpeta"
            value={destino}
            onChange={(evento) => setDestino(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') onConfirmar(destino.trim())
            }}
          />
          <p id="pista-carpeta" className="text-muted-foreground text-xs">
            Tiene que existir. «~» es la carpeta de inicio de la credencial.
          </p>
        </div>

        <DialogFooter>
          <Button disabled={!destino.trim()} onClick={() => onConfirmar(destino.trim())}>
            Subir
          </Button>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
