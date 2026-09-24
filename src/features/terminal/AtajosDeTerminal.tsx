import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Lo que no se ve en pantalla y hace falta saber la primera vez. */
const ATAJOS: { teclas: string; hace: string }[] = [
  { teclas: 'Alt + 1…9', hace: 'Cambiar de terminal' },
  { teclas: 'Ctrl + Shift + F', hace: 'Buscar en lo que ya pasó' },
  { teclas: 'Ctrl + Shift + C', hace: 'Copiar lo seleccionado' },
  { teclas: 'Ctrl + Shift + V', hace: 'Pegar' },
  { teclas: 'Arrastrar un archivo', hace: 'Subirlo a la carpeta donde está' },
  { teclas: 'exit', hace: 'Cerrar la terminal' },
]

interface AtajosProps {
  abierto: boolean
  onCerrar: () => void
}

export function AtajosDeTerminal({ abierto, onCerrar }: AtajosProps) {
  return (
    <Dialog open={abierto} onOpenChange={(sigue) => !sigue && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de la terminal</DialogTitle>
          <DialogDescription>Para no tocar el ratón.</DialogDescription>
        </DialogHeader>

        <dl className="divide-border divide-y text-sm">
          {ATAJOS.map((atajo) => (
            <div key={atajo.teclas} className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground">{atajo.hace}</dt>
              <dd className="font-machine text-xs">{atajo.teclas}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
