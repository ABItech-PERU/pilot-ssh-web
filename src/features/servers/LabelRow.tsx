import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRightIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as serversApi from '@/features/servers/api'
import { LabelColorMenu } from '@/features/servers/LabelColorMenu'
import { LabelDot } from '@/features/servers/LabelDot'
import { LabelValueDialog } from '@/features/servers/LabelValueDialog'
import { contarUso, describirUso } from '@/features/servers/labels'
import { toApiError } from '@/lib/api-error'
import { cn } from 'cn'
import { resolveColor } from '@/lib/palette'
import type { LabelDefinition, PaletteColor } from '@/types/api'

interface Props {
  etiqueta: LabelDefinition
  administra: boolean
  onRenombrar: () => void
}

/** Opciones al desplegar, cada una editable en su fila con su uso. */
export function LabelRow({ etiqueta, administra, onRenombrar }: Props) {
  const cliente = useQueryClient()
  // Abierta de partida: al entrar se buscan las opciones
  const [abierta, setAbierta] = useState(true)
  const [enOpcion, setEnOpcion] = useState<string | null>(null)
  const [anadiendo, setAnadiendo] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const eliminar = useMutation({
    mutationFn: () => serversApi.deleteLabel(etiqueta.id),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['label-definitions'] })
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      setEliminando(false)
      toast.success('Etiqueta eliminada.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const accesos = etiqueta.usage.grants
  const asignada = etiqueta.values.some(
    (opcion) => contarUso(etiqueta.usage.values[opcion]) > 0,
  )
  // En uso no se elimina: cortaria el acceso de quien entra por ella
  const sostieneAlgo = asignada || accesos > 0

  return (
    <li>
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          aria-expanded={abierta}
          aria-label={`Plegar o desplegar ${etiqueta.key}`}
          onClick={() => setAbierta((actual) => !actual)}
          className="focus-visible:outline-ring flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          <ChevronRightIcon
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              abierta && 'rotate-90',
            )}
          />
          <TagIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{etiqueta.key}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {describirCabecera(etiqueta)}
            </span>
          </span>
        </button>

        {administra && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Cambiar el nombre de ${etiqueta.key}`}
            onClick={onRenombrar}
          >
            <PencilIcon className="size-4" />
          </Button>
        )}

        {administra && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones de ${etiqueta.key}`}
              >
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => setAnadiendo(true)}>
                <PlusIcon />
                Añadir opción
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={sostieneAlgo}
                onSelect={() => setEliminando(true)}
              >
                <Trash2Icon />
                Eliminar etiqueta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {abierta && (
        // Sin marco propio: un recuadro dentro de la lista escalona la
        // pantalla
        <div className="bg-muted/20 border-t">
          {etiqueta.values.length === 0 && (
            <p className="text-muted-foreground px-4 pt-3 pl-10 text-xs">
              Todavía no tiene opciones.
            </p>
          )}

          <ul className="divide-border/60 divide-y">
            {etiqueta.values.map((opcion) => (
              <Opcion
                key={opcion}
                etiqueta={etiqueta}
                opcion={opcion}
                administra={administra}
                onRenombrar={() => setEnOpcion(opcion)}
              />
            ))}
          </ul>

          {administra && (
            <div className="px-4 py-3 pl-10">
              <Button variant="outline" size="sm" onClick={() => setAnadiendo(true)}>
                <PlusIcon />
                Añadir opción
              </Button>
            </div>
          )}
        </div>
      )}

      <LabelValueDialog
        etiqueta={etiqueta}
        opcion={enOpcion}
        open={anadiendo || enOpcion !== null}
        onOpenChange={(abierto) => {
          if (abierto) return
          setAnadiendo(false)
          setEnOpcion(null)
        }}
      />

      <ConfirmDialog
        open={eliminando}
        onOpenChange={setEliminando}
        titulo={`¿Eliminar la etiqueta ${etiqueta.key}?`}
        descripcion="No está asignada a ningún servidor ni credencial."
        detalles={[
          'Deja de poder elegirse al registrar un servidor o una credencial',
          'Se puede volver a crear con las mismas opciones',
        ]}
        accion="Eliminar etiqueta"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => eliminar.mutate()}
      />
    </li>
  )
}

/** Resumen legible sin desplegar: opciones y uso. */
function describirCabecera(etiqueta: LabelDefinition): string {
  const opciones =
    etiqueta.values.length === 0
      ? 'Sin opciones'
      : etiqueta.values.length === 1
        ? '1 opción'
        : `${etiqueta.values.length} opciones`
  if (etiqueta.usage.grants === 0) return opciones

  const accesos =
    etiqueta.usage.grants === 1
      ? '1 acceso concedido'
      : `${etiqueta.usage.grants} accesos concedidos`
  return `${opciones} · ${accesos}`
}

function Opcion({
  etiqueta,
  opcion,
  administra,
  onRenombrar,
}: {
  etiqueta: LabelDefinition
  opcion: string
  administra: boolean
  onRenombrar: () => void
}) {
  const cliente = useQueryClient()
  const fila = etiqueta.usage.values[opcion]
  const total = contarUso(fila)

  const pintar = useMutation({
    mutationFn: (color: PaletteColor) =>
      serversApi.updateLabelValue(etiqueta.id, opcion, { color }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['label-definitions'] }),
    onError: (error) => toast.error(toApiError(error).message),
  })

  const quitar = useMutation({
    mutationFn: () => serversApi.removeLabelValue(etiqueta.id, opcion),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['label-definitions'] })
      toast.success('Opción retirada.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <li className="flex items-center gap-3 py-2.5 pr-4 pl-10">
      {administra ? (
        <LabelColorMenu
          color={resolveColor(etiqueta.colors[opcion])}
          opcion={opcion}
          onChange={(color) => pintar.mutate(color)}
        />
      ) : (
        <LabelDot color={etiqueta.colors[opcion]} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{opcion}</span>
        {total === 0 ? (
          <span className="text-muted-foreground block text-xs">Sin asignar</span>
        ) : (
          <Link
            to={`/app/servers?label=${encodeURIComponent(`${etiqueta.key}:${opcion}`)}`}
            className="text-muted-foreground hover:text-foreground block truncate text-xs underline-offset-2 hover:underline"
          >
            {describirUso(fila)}
          </Link>
        )}
      </span>

      {administra && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar la opción ${opcion}`}
            onClick={onRenombrar}
          >
            <PencilIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={total > 0 || quitar.isPending}
            title={razonParaNoQuitar(total)}
            aria-label={`Retirar ${opcion} de la lista`}
            onClick={() => quitar.mutate()}
          >
            <XIcon className="size-4" />
          </Button>
        </>
      )}
    </li>
  )
}

function razonParaNoQuitar(total: number): string | undefined {
  if (total > 0) {
    return 'Está asignada. Quítela de esos servidores y credenciales primero.'
  }
  return undefined
}
