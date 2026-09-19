import { cn } from 'cn'
import {
  CheckIcon,
  CircleHelpIcon,
  CopyIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descripcion: React.ReactNode
  /** Lo que se va con la baja. Vacio: no se pinta la lista. */
  detalles?: string[]
  /** Texto que habilita el boton. Se pide cuando lo borrado arrastra hijos
   *  o historial. */
  confirmacion?: string
  /** Un verbo: "Eliminar servidor", "Quitar enlace". Nunca "Aceptar". */
  accion: string
  destructiva?: boolean
  pendiente?: boolean
  onConfirmar: () => void
}

/** Nada se borra al primer clic: dice que se va y, si pesa, pide el nombre. */
export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  detalles = [],
  confirmacion,
  accion,
  destructiva = false,
  pendiente = false,
  onConfirmar,
}: Props) {
  const idConfirmacion = useId()
  const [tecleado, setTecleado] = useState('')
  const [ultimo, setUltimo] = useState({ titulo, descripcion, detalles, confirmacion })
  const [copiado, setCopiado] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  // Cada apertura empieza en blanco y congela lo mostrado, para que el
  // titulo no se vacie mientras el dialogo se desvanece. Abierto, mandan
  // las props
  useEffect(() => {
    if (!open) return
    setTecleado('')
    setCopiado(false)
    setUltimo({ titulo, descripcion, detalles, confirmacion })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const mostrado = open ? { titulo, descripcion, detalles, confirmacion } : ultimo
  const habilitado =
    !pendiente && (!mostrado.confirmacion || tecleado.trim() === mostrado.confirmacion)

  // Un clic copia el nombre y deja el foco en el campo para pegarlo
  const copiarNombre = async () => {
    if (!mostrado.confirmacion) return
    try {
      await navigator.clipboard.writeText(mostrado.confirmacion)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1600)
      entrada.current?.focus()
    } catch {
      // Sin portapapeles queda la seleccion: el clic marca el nombre entero
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="space-y-3">
          <span
            className={cn(
              'flex size-11 items-center justify-center rounded-full ring-8',
              destructiva
                ? 'bg-destructive/10 text-destructive ring-destructive/5'
                : 'bg-muted text-muted-foreground ring-muted/40',
            )}
          >
            {destructiva ? (
              <TriangleAlertIcon className="size-5" />
            ) : (
              <CircleHelpIcon className="size-5" />
            )}
          </span>
          <AlertDialogTitle>{mostrado.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{mostrado.descripcion}</AlertDialogDescription>
        </AlertDialogHeader>

        {mostrado.detalles.length > 0 && (
          <div
            className={cn(
              'rounded-lg border p-4 text-sm',
              destructiva ? 'border-destructive/25 bg-destructive/5' : 'bg-muted/40',
            )}
          >
            <p className="font-medium">Qué pasa</p>
            <ul className="text-muted-foreground mt-2 space-y-1.5">
              {mostrado.detalles.map((detalle) => (
                <li key={detalle} className="flex gap-2">
                  <span
                    className={destructiva ? 'text-destructive' : 'text-foreground'}
                    aria-hidden
                  >
                    &bull;
                  </span>
                  <span className="min-w-0 break-words">{detalle}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mostrado.confirmacion && (
          <div className="space-y-2">
            <Label htmlFor={idConfirmacion} className="sr-only">
              Escriba {mostrado.confirmacion} para confirmar
            </Label>
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
              Escriba
              <button
                type="button"
                onClick={copiarNombre}
                className="font-machine bg-muted hover:bg-accent focus-visible:outline-ring inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-semibold select-all focus-visible:-outline-offset-2 focus-visible:outline-1"
                aria-label={copiado ? 'Copiado' : `Copiar ${mostrado.confirmacion}`}
              >
                {mostrado.confirmacion}
                {copiado ? (
                  <CheckIcon className="text-success size-3.5" />
                ) : (
                  <CopyIcon className="size-3.5 opacity-60" />
                )}
              </button>
              para confirmar
            </p>
            <Input
              ref={entrada}
              id={idConfirmacion}
              value={tecleado}
              onChange={(evento) => setTecleado(evento.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-machine"
            />
          </div>
        )}

        {/* La accion primero y cancelar despues, como en los formularios */}
        <AlertDialogFooter>
          <AlertDialogAction
            disabled={!habilitado}
            variant={destructiva ? 'destructive' : 'default'}
            onClick={(evento) => {
              // No se cierra solo: lo cierra quien llama si la mutacion sale
              // bien
              evento.preventDefault()
              onConfirmar()
            }}
          >
            {pendiente && <Loader2Icon className="animate-spin" />}
            {accion}
          </AlertDialogAction>
          <AlertDialogCancel variant="outline" disabled={pendiente}>
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
