import { cn } from 'cn'
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className="space-y-1">
      {/* Se envuelve: con la barra abierta en un portatil, titulo y accion
          pueden no caber en una linea */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {action}
      </div>
      {description && (
        <p className="text-muted-foreground max-w-prose text-sm">{description}</p>
      )}
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border/70 flex flex-col items-center rounded-lg border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

/** Todo fallo se enseña igual: mensaje del backend y, si procede, reintento. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const fallo = toApiError(error)

  return (
    <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center rounded-lg border px-6 py-12 text-center">
      <span className="bg-destructive/10 text-destructive grid size-11 place-items-center rounded-full">
        <AlertTriangleIcon className="size-5" />
      </span>
      <p className="mt-4 max-w-sm text-sm font-medium">{fallo.message}</p>
      {onRetry && fallo.isRetryable && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCwIcon />
          Reintentar
        </Button>
      )}
    </div>
  )
}

/** Imita la forma de la tabla para que la vista no salte al cargar. */
export function TableSkeleton({
  rows = 4,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="divide-border divide-y" aria-hidden>
      {Array.from({ length: rows }, (_, fila) => (
        <div key={fila} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }, (_, columna) => (
            <Skeleton
              key={columna}
              className="h-4"
              style={{
                width: columna === 0 ? '28%' : `${Math.max(10, 22 - columna * 3)}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Mientras llega la primera pantalla, que se descarga aparte: el router
 *  necesita algo que pintar. Discreta: suele durar un parpadeo. */
export function LoadingScreen() {
  return (
    <div role="status" className="bg-background grid min-h-svh place-items-center">
      <Loader2Icon className="text-muted-foreground size-5 animate-spin" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
