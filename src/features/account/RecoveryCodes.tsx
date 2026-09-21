import { CheckIcon, CopyIcon, DownloadIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { textoDeRespaldo } from '@/features/account/dos-pasos'
import { descargarArchivo } from '@/lib/download'

interface Props {
  codigos: string[]
  correo: string
  guardados: boolean
  onGuardados: (guardados: boolean) => void
}

/** Se muestran una sola vez: copiar o descargar, y confirmar que se
 *  guardaron antes de cerrar. */
export function RecoveryCodes({ codigos, correo, guardados, onGuardados }: Props) {
  const id = useId()
  const [copiados, setCopiados] = useState(false)
  const texto = () => textoDeRespaldo(codigos, correo, new Date())

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto())
      setCopiados(true)
      window.setTimeout(() => setCopiados(false), 1600)
    } catch {
      // Sin portapapeles queda descargar
    }
  }

  return (
    <div className="space-y-4">
      <ol className="bg-muted/40 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border p-4">
        {codigos.map((codigo, indice) => (
          <li key={codigo} className="flex items-baseline gap-2">
            <span className="text-muted-foreground w-4 text-right text-xs tabular-nums">
              {indice + 1}
            </span>
            <span className="font-machine text-sm">{codigo}</span>
          </li>
        ))}
      </ol>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={copiar}>
          {copiados ? <CheckIcon className="text-success" /> : <CopyIcon />}
          {copiados ? 'Copiados' : 'Copiar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() =>
            descargarArchivo(
              new Blob([texto()], { type: 'text/plain;charset=utf-8' }),
              'Pilot SSH - Códigos de respaldo.txt',
            )
          }
        >
          <DownloadIcon />
          Descargar
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          id={id}
          checked={guardados}
          onCheckedChange={(valor) => onGuardados(valor === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor={id}
          className="block cursor-pointer text-sm leading-snug font-normal"
        >
          Los guardé en un lugar seguro, como mi gestor de contraseñas.
        </Label>
      </div>
    </div>
  )
}
