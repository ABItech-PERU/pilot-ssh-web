import { ChevronRightIcon, PlusIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

/** Bloque de una pantalla de resumen: rótulo, acción y marco. Lo comparten
 *  servidores, credenciales y créditos. */
export function Bloque({
  titulo,
  accion,
  children,
}: {
  titulo: string
  accion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex h-8 items-center justify-between">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
          {titulo}
        </h3>
        {accion}
      </div>
      <div className="overflow-hidden rounded-lg border">{children}</div>
    </section>
  )
}

/** Pie de un bloque recortado: lleva a la lista entera, en otra vista o en
 *  otra ruta. */
export function VerTodo({
  to,
  onClick,
  children,
}: {
  to?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const clases =
    'hover:bg-accent/60 focus-visible:outline-ring flex h-10 w-full items-center justify-center gap-1 border-t text-sm font-medium focus-visible:-outline-offset-2 focus-visible:outline-1'

  if (to) {
    return (
      <Link to={to} className={clases}>
        {children}
        <ChevronRightIcon className="size-4" />
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={clases}>
      {children}
      <ChevronRightIcon className="size-4" />
    </button>
  )
}

export function VacioDeBloque({
  texto,
  accion,
  onAccion,
}: {
  texto: string
  accion: string
  /** Sin manejador, solo el texto: no se ofrece un alta que daria 403. */
  onAccion?: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <p className="text-muted-foreground text-sm">{texto}</p>
      {onAccion && (
        <Button variant="outline" size="sm" onClick={onAccion}>
          <PlusIcon />
          {accion}
        </Button>
      )}
    </div>
  )
}
