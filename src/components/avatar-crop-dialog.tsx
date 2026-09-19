import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

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
import { Slider } from '@/components/ui/slider'

const LADO = 512

interface Props {
  /** La imagen elegida, ya leída como URL local. */
  imagen: string
  /** Si la subida falla, se dice aquí: es donde está mirando quien pulsó. */
  aviso: string | null
  pendiente: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (recorte: Blob) => void
}

/** Recorte en el navegador: el encuadre lo elige quien sube la foto, y se
 *  sube el trozo, no el archivo entero. */
export function AvatarCropDialog({
  imagen,
  aviso,
  pendiente,
  open,
  onOpenChange,
  onGuardar,
}: Props) {
  const [posicion, setPosicion] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [recorte, setRecorte] = useState<Area | null>(null)

  const alTerminar = useCallback((_: Area, enPixeles: Area) => setRecorte(enPixeles), [])

  const guardar = async () => {
    if (!recorte) return
    onGuardar(await recortar(imagen, recorte))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recortar la imagen</DialogTitle>
          <DialogDescription>
            Ajuste el encuadre para elegir qué se ve en el avatar.
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted relative h-72 overflow-hidden rounded-lg">
          <Cropper
            image={imagen}
            crop={posicion}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setPosicion}
            onZoomChange={setZoom}
            onCropComplete={alTerminar}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zoom">Acercar</Label>
          <Slider
            id="zoom"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([valor]) => setZoom(valor ?? 1)}
          />
        </div>

        <DialogFooter>
          <Button disabled={!recorte || pendiente} onClick={guardar}>
            {pendiente && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

/** Cuadrado de 512 px: basta para un avatar y pesa poco en cada carga. */
async function recortar(origen: string, area: Area): Promise<Blob> {
  const imagen = await cargar(origen)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO
  lienzo.height = LADO

  const pincel = lienzo.getContext('2d')
  if (!pincel) throw new Error('El navegador no pudo preparar el recorte.')

  pincel.drawImage(imagen, area.x, area.y, area.width, area.height, 0, 0, LADO, LADO)

  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (resultado) =>
        resultado ? resolver(resultado) : rechazar(new Error('No se pudo recortar.')),
      'image/webp',
      0.9,
    )
  })
}

function cargar(origen: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image()
    imagen.addEventListener('load', () => resolver(imagen))
    imagen.addEventListener('error', () => rechazar(new Error('No se pudo abrir.')))
    imagen.src = origen
  })
}
