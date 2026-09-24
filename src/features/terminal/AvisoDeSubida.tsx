import { CheckIcon, CopyIcon, FolderOpenIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/** Lo justo para leer la ruta y decidir. */
const EN_PANTALLA_MS = 12_000

export function avisarSubida(ruta: string, onIr: () => void) {
  toast.custom(
    (aviso) => (
      <AvisoDeSubida
        ruta={ruta}
        onIr={() => {
          onIr()
          toast.dismiss(aviso)
        }}
      />
    ),
    { duration: EN_PANTALLA_MS },
  )
}

interface AvisoProps {
  ruta: string
  onIr: () => void
}

/** Dónde cayó el archivo y cómo llegar, sin buscarlo. */
function AvisoDeSubida({ ruta, onIr }: AvisoProps) {
  const [copiada, setCopiada] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(ruta)
      setCopiada(true)
      window.setTimeout(() => setCopiada(false), 1600)
    } catch {
      // Sin portapapeles, la ruta queda a la vista
    }
  }

  return (
    <div className="bg-popover text-popover-foreground w-[22rem] max-w-[calc(100vw-2rem)] rounded-md border p-3 shadow-lg">
      <p className="text-sm font-medium">Archivo subido</p>
      <p className="font-machine text-muted-foreground mt-1 text-xs break-all">{ruta}</p>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={copiar}>
          {copiada ? <CheckIcon className="text-success" /> : <CopyIcon />}
          {copiada ? 'Copiada' : 'Copiar ruta'}
        </Button>
        <Button size="sm" variant="outline" onClick={onIr}>
          <FolderOpenIcon />
          Ir a la carpeta
        </Button>
      </div>
    </div>
  )
}
