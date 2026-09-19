import { cn } from 'cn'
import { Building2Icon, XIcon } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router'

/** La organización de la URL entra como un filtro más: se limpia con los
 *  demás. */
export function useOrganizacionDeUrl(
  setFiltro: (clave: 'organization', valor: string) => void,
) {
  const [parametros, setParametros] = useSearchParams()
  const organizacion = parametros.get('organization') ?? ''

  useEffect(() => {
    if (organizacion) setFiltro('organization', organizacion)
  }, [organizacion, setFiltro])

  // Quita también el parámetro, para que recargar no lo reponga
  const quitar = useCallback(() => {
    setFiltro('organization', '')
    if (organizacion) setParametros({}, { replace: true })
  }, [organizacion, setFiltro, setParametros])

  return { quitar }
}

/** El filtro, a la vista y con su cruz: una lista acotada debe decirlo. */
export function OrganizacionElegida({
  slug,
  onQuitar,
  className,
}: {
  slug: string
  onQuitar: () => void
  /** Llena su celda en el panel de filtros, como los selectores. */
  className?: string
}) {
  return (
    <span
      className={cn(
        'bg-muted inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm',
        className,
      )}
    >
      <Building2Icon className="text-muted-foreground size-4 shrink-0" />
      <span className="font-machine min-w-0 flex-1 truncate">{slug}</span>
      <button
        type="button"
        aria-label="Quitar la organización del filtro"
        onClick={onQuitar}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-sm focus-visible:outline-1"
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}
