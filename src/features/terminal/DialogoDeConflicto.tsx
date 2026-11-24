import { useEffect, useId, useState } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export type DecisionDeConflicto = 'reemplazar' | 'renombrar' | 'omitir'

export interface Conflicto {
  nombre: string
  carpeta: string
  /** Cuántos más esperan en la cola, para decidir por todos de una vez. */
  quedan: number
}

interface Props {
  conflicto: Conflicto | null
  onDecidir: (decision: DecisionDeConflicto, aTodos: boolean) => void
}

/** Un nombre repetido no se pisa sin preguntar, como en el explorador. */
export function DialogoDeConflicto({ conflicto, onDecidir }: Props) {
  const [aTodos, setATodos] = useState(false)
  const idDeTodos = useId()

  useEffect(() => {
    if (conflicto) setATodos(false)
  }, [conflicto])

  const decidir = (decision: DecisionDeConflicto) => onDecidir(decision, aTodos)

  return (
    <AlertDialog open={conflicto !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ya existe {conflicto?.nombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Hay un archivo con ese nombre en{' '}
            <span className="font-machine break-all">{conflicto?.carpeta}</span>. Elija
            qué hacer con el que está subiendo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {conflicto && conflicto.quedan > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={idDeTodos}
              checked={aTodos}
              onCheckedChange={(valor) => setATodos(valor === true)}
            />
            <Label htmlFor={idDeTodos} className="font-normal">
              Hacer lo mismo con los {conflicto.quedan} que siguen
            </Label>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => decidir('omitir')}>
            Omitir
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => decidir('renombrar')}>
              Conservar ambos
            </Button>
            <Button variant="destructive" onClick={() => decidir('reemplazar')}>
              Reemplazar
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
