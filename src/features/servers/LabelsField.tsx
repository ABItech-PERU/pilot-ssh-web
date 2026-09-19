import { useQuery } from '@tanstack/react-query'
import { PlusIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router'
import { useFormContext } from 'react-hook-form'

import { ColorChip } from '@/components/color-chip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as serversApi from '@/features/servers/api'
import { LabelDot } from '@/features/servers/LabelDot'
import { describirEtiqueta } from '@/features/servers/labels'
import type { LabelDefinition } from '@/types/api'

export interface ConEtiquetas {
  labels: Record<string, string>
}

/** Solo del catálogo: tecleadas, una errata crea otra etiqueta y el acceso
 *  por la original no la cubre. Se muestran las puestas y se añaden desde
 *  un menú, no un selector por etiqueta. */
export function LabelsField({ slug }: { slug: string }) {
  const { watch, setValue } = useFormContext<ConEtiquetas>()

  const catalogo = useQuery({
    queryKey: serversApi.clavesServidor.catalogo(slug),
    queryFn: () => serversApi.fetchLabelCatalog(slug),
  })

  // Sin opciones no se ofrece: solo habria «Sin definir»
  const etiquetas = (catalogo.data ?? []).filter((etiqueta) => etiqueta.values.length > 0)
  const puestas = watch('labels') ?? {}

  const poner = (clave: string, valor: string) =>
    setValue(`labels.${clave}`, valor, { shouldDirty: true })

  const quitar = (clave: string) => setValue(`labels.${clave}`, '', { shouldDirty: true })

  if (catalogo.isPending) {
    return <p className="text-muted-foreground text-xs">Cargando las etiquetas…</p>
  }

  if (etiquetas.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Esta organización no tiene etiquetas.{' '}
        <Link to="/app/team/labels" className="text-foreground underline">
          Defínalas en Equipo
        </Link>{' '}
        para conceder acceso a varias de una vez.
      </p>
    )
  }

  const conValor = etiquetas.filter((etiqueta) => puestas[etiqueta.key])

  return (
    <div className="space-y-3">
      {conValor.length > 0 && (
        // Una por fila: en hilera se leen como una frase y el aspa se pierde
        <ul className="divide-border overflow-hidden rounded-lg border divide-y">
          {conValor.map((etiqueta) => (
            <li key={etiqueta.id} className="flex items-center gap-2 py-1.5 pr-1 pl-2">
              <ColorChip color={etiqueta.colors[puestas[etiqueta.key] ?? '']}>
                {describirEtiqueta(`${etiqueta.key}:${puestas[etiqueta.key]}`)}
              </ColorChip>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label={`Quitar ${etiqueta.key}`}
                onClick={() => quitar(etiqueta.key)}
              >
                <XIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <PlusIcon />
            {conValor.length > 0 ? 'Añadir otra etiqueta' : 'Añadir etiqueta'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
          {etiquetas.map((etiqueta) => (
            <Opciones
              key={etiqueta.id}
              etiqueta={etiqueta}
              puesta={puestas[etiqueta.key]}
              onElegir={(valor) => poner(etiqueta.key, valor)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Una etiqueta, un valor: cambiarla es elegir otra opción. */
function Opciones({
  etiqueta,
  puesta,
  onElegir,
}: {
  etiqueta: LabelDefinition
  puesta?: string
  onElegir: (valor: string) => void
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="min-w-0 flex-1 truncate">{etiqueta.key}</span>
        {puesta && <LabelDot color={etiqueta.colors[puesta]} />}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
        {etiqueta.values.map((valor) => (
          <DropdownMenuItem key={valor} onSelect={() => onElegir(valor)}>
            <LabelDot color={etiqueta.colors[valor]} />
            <span className="min-w-0 flex-1 truncate">{valor}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
