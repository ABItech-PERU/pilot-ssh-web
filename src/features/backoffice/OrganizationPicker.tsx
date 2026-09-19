import { useQuery } from '@tanstack/react-query'
import { SearchIcon, SearchXIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import * as platformApi from '@/features/backoffice/api'
import { OrganizationAvatar } from '@/features/organizations/OrganizationAvatar'
import { formatCredits } from '@/lib/format'
import type { PlatformOrganization } from '@/types/api'

/** Tope para no llenar el diálogo: quien busca acota. */
const A_LA_VISTA = 5
const MS_DEBOUNCE = 300

/** Busca por nombre, dirección o correo de alguien del equipo. Muestra el
 *  saldo para decidir cuánto asignar. Las propias salen apagadas: su dinero
 *  lo mueve otra persona del personal. */
export function OrganizationPicker({
  onElegir,
}: {
  onElegir: (organizacion: PlatformOrganization) => void
}) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Con retardo: una consulta por pausa, no por tecla
  useEffect(() => {
    const temporizador = window.setTimeout(() => setBusqueda(texto), MS_DEBOUNCE)
    return () => window.clearTimeout(temporizador)
  }, [texto])

  const organizaciones = useQuery({
    queryKey: platformApi.clavesPlataforma.organizaciones(1, A_LA_VISTA, {
      search: busqueda,
    }),
    queryFn: () =>
      platformApi.fetchOrganizations(1, A_LA_VISTA, busqueda ? { search: busqueda } : {}),
    placeholderData: (anterior) => anterior,
  })
  const encontradas = organizaciones.data?.results ?? []
  const restantes = (organizaciones.data?.count ?? 0) - encontradas.length

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        A qué organización
      </label>
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          autoFocus
          placeholder="Buscar por nombre, dirección o correo"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          className="h-10! pl-9"
        />
      </div>

      <div className="divide-y rounded-lg border">
        {organizaciones.isPending ? (
          Array.from({ length: 3 }, (_, indice) => (
            <div key={indice} className="flex items-center gap-3 p-3">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="h-4 w-44" />
            </div>
          ))
        ) : encontradas.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
            <SearchXIcon className="size-4 shrink-0" />
            Ninguna con ese nombre.
          </p>
        ) : (
          encontradas.map((organizacion) => (
            <button
              key={organizacion.id}
              type="button"
              disabled={organizacion.is_own}
              onClick={() => onElegir(organizacion)}
              className="hover:bg-accent/60 focus-visible:outline-ring flex w-full items-center gap-3 p-3 text-left focus-visible:-outline-offset-2 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-60"
            >
              <OrganizationAvatar organization={organizacion} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {organizacion.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {organizacion.slug}
                  {organizacion.owner && ` · ${organizacion.owner.email}`}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {organizacion.is_own
                  ? 'Es miembro'
                  : `${formatCredits(organizacion.balance)} créditos`}
              </span>
            </button>
          ))
        )}
      </div>

      {restantes > 0 && (
        <p className="text-muted-foreground text-xs">
          Y {restantes} más. Escriba para acotar.
        </p>
      )}
    </div>
  )
}
