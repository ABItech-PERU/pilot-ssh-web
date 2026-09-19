import { Skeleton } from '@/components/ui/skeleton'

/** Mientras se lee la invitación: el formulario nace con el correo puesto,
 *  sin rellenarse bajo el cursor. */
export function AuthFormSkeleton() {
  return (
    <div className="space-y-8" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  )
}
