import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SidePanelFooter } from '@/components/side-panel'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/field-error'
import { isSafeHref, TIPOS, TIPOS_DE_ENLACE } from '@/features/servers/links'
import { esquemaEnlace, type EnlaceFormulario } from '@/features/servers/LinksField'
import { toApiError } from '@/lib/api-error'
import type { ResourceLink, LinkKind } from '@/types/api'

type Edicion = { indice: number | null }

interface Props {
  links: ResourceLink[]
  primerTipo: LinkKind
  /** Descripción del vacío. */
  vacio: string
  /** Alta al pie del panel lateral, a todo el ancho; en pagina, bajo la
   *  lista. */
  alPie?: boolean
  /** Misma fila para quien no gestiona: abre y copia, sin alta ni edicion. */
  soloLectura?: boolean
  /** Guarda la lista entera y devuelve la persistida. */
  onGuardar: (links: ResourceLink[]) => Promise<ResourceLink[]>
}

/** Alta, edicion y baja de uno en uno, guardadas al momento: sin
 *  «Guardar cambios» final. */
export function LinksEditor({
  links,
  primerTipo,
  vacio,
  alPie = false,
  soloLectura = false,
  onGuardar,
}: Props) {
  // Copia local refrescada con la respuesta: la prop es una fila de lista y
  // queda desfasada al guardar
  const [lista, setLista] = useState<ResourceLink[]>(links)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [aQuitar, setAQuitar] = useState<number | null>(null)

  const guardar = useMutation({
    mutationFn: onGuardar,
    onSuccess: (guardados) => {
      setLista(guardados)
      setEdicion(null)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const guardarFila = (valores: ResourceLink) => {
    const nueva =
      edicion?.indice === null || edicion === null
        ? [...lista, valores]
        : lista.map((uno, indice) => (indice === edicion.indice ? valores : uno))
    guardar.mutate(nueva, { onSuccess: () => toast.success('Enlace guardado.') })
  }

  const quitar = (indice: number) => {
    guardar.mutate(
      lista.filter((_, posicion) => posicion !== indice),
      {
        onSuccess: () => {
          setAQuitar(null)
          toast.success('Enlace quitado.')
        },
      },
    )
  }

  const objetivo = aQuitar === null ? null : (lista[aQuitar] ?? null)

  const anadir = (
    <Button
      variant={alPie ? 'default' : 'outline'}
      className={alPie ? 'flex-1' : undefined}
      onClick={() => setEdicion({ indice: null })}
      disabled={Boolean(edicion)}
    >
      <PlusIcon />
      Añadir enlace
    </Button>
  )

  return (
    <div className={alPie ? 'flex flex-1 flex-col' : 'space-y-3'}>
      <div className={alPie ? 'min-h-0 flex-1 overflow-y-auto p-5' : undefined}>
        <div className="overflow-hidden rounded-lg border">
          {lista.length === 0 && !edicion ? (
            <EmptyState
              compacto
              icon={LinkIcon}
              title="Sin enlaces"
              description={vacio}
            />
          ) : (
            <ul className="divide-y">
              {lista.map((enlace, indice) =>
                edicion?.indice === indice ? (
                  <li key={`${indice}-editando`} className="p-3">
                    <EditorDeEnlace
                      inicial={enlace}
                      pendiente={guardar.isPending}
                      onGuardar={guardarFila}
                      onCancelar={() => setEdicion(null)}
                    />
                  </li>
                ) : (
                  <FilaDeEnlace
                    key={`${indice}-${enlace.url}`}
                    enlace={enlace}
                    bloqueada={guardar.isPending || Boolean(edicion)}
                    onEditar={soloLectura ? undefined : () => setEdicion({ indice })}
                    onQuitar={soloLectura ? undefined : () => setAQuitar(indice)}
                  />
                ),
              )}
              {edicion?.indice === null && (
                <li className="p-3">
                  <EditorDeEnlace
                    inicial={{
                      kind: primerTipo,
                      label: TIPOS_DE_ENLACE[primerTipo].etiqueta,
                      url: '',
                    }}
                    pendiente={guardar.isPending}
                    onGuardar={guardarFila}
                    onCancelar={() => setEdicion(null)}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {alPie ? (
        <SidePanelFooter className="mt-auto">{!soloLectura && anadir}</SidePanelFooter>
      ) : (
        !soloLectura && anadir
      )}

      <ConfirmDialog
        open={aQuitar !== null}
        onOpenChange={(abierto) => !abierto && setAQuitar(null)}
        titulo={`¿Quitar ${objetivo?.label ?? ''}?`}
        descripcion="Solo desaparece de aquí. La dirección sigue existiendo."
        detalles={objetivo ? [objetivo.url] : []}
        accion="Quitar enlace"
        destructiva
        pendiente={guardar.isPending}
        onConfirmar={() => aQuitar !== null && quitar(aQuitar)}
      />
    </div>
  )
}

function FilaDeEnlace({
  enlace,
  bloqueada,
  onEditar,
  onQuitar,
}: {
  enlace: ResourceLink
  bloqueada: boolean
  onEditar?: () => void
  onQuitar?: () => void
}) {
  const { icono: Icono } = TIPOS_DE_ENLACE[enlace.kind] ?? TIPOS_DE_ENLACE.other
  const seguro = isSafeHref(enlace.url)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace.url)
      toast.success('Dirección copiada.')
    } catch {
      toast.error('No se pudo copiar la dirección.')
    }
  }

  const contenido = (
    <>
      <Icono className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{enlace.label}</span>
        <span className="font-machine text-muted-foreground block truncate text-xs">
          {enlace.url}
        </span>
      </span>
    </>
  )

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      {seguro ? (
        <a
          href={enlace.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-accent/60 focus-visible:outline-ring -m-1.5 flex min-w-0 flex-1 items-center gap-3 rounded-md p-1.5 focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          {contenido}
          <ExternalLinkIcon className="text-muted-foreground size-3.5 shrink-0" />
        </a>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{contenido}</span>
      )}
      {/* La fila entera abre. El menu empieza por copiar, no por editar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={bloqueada}
            aria-label={`Acciones de ${enlace.label}`}
          >
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void copiar()}>
            <CopyIcon className="size-4" />
            Copiar dirección
          </DropdownMenuItem>
          {onEditar && onQuitar && (
            <>
              <DropdownMenuItem onSelect={onEditar}>
                <PencilIcon className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onQuitar}>
                <Trash2Icon className="size-4" />
                Quitar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/** Mismo esquema que el alta. */
function EditorDeEnlace({
  inicial,
  pendiente,
  onGuardar,
  onCancelar,
}: {
  inicial: EnlaceFormulario
  pendiente: boolean
  onGuardar: (enlace: ResourceLink) => void
  onCancelar: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnlaceFormulario, unknown, ResourceLink>({
    resolver: zodResolver(esquemaEnlace),
    defaultValues: inicial,
  })

  const tipo = watch('kind')

  // Cambiar el tipo renombra solo si el nombre era el del tipo anterior
  const cambiarTipo = (nuevo: LinkKind) => {
    const nombre = watch('label')
    if (!nombre || nombre === TIPOS_DE_ENLACE[tipo].etiqueta) {
      setValue('label', TIPOS_DE_ENLACE[nuevo].etiqueta)
    }
    setValue('kind', nuevo)
  }

  return (
    <form
      onSubmit={(evento) => {
        // Puede ir dentro de otro formulario: el envio no se propaga
        evento.stopPropagation()
        void handleSubmit(onGuardar)(evento)
      }}
      className="space-y-3"
      noValidate
    >
      <div className="grid grid-cols-[8.5rem_1fr] gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="enlace-tipo">Tipo</Label>
          <Select value={tipo} onValueChange={(valor) => cambiarTipo(valor as LinkKind)}>
            <SelectTrigger id="enlace-tipo" className="h-10! w-full gap-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((uno) => {
                const { etiqueta, icono: Icono } = TIPOS_DE_ENLACE[uno]
                return (
                  <SelectItem key={uno} value={uno}>
                    <span className="flex items-center gap-2">
                      <Icono className="text-muted-foreground size-4" />
                      {etiqueta}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="enlace-nombre">Nombre</Label>
          <Input
            id="enlace-nombre"
            className="h-10!"
            autoComplete="off"
            autoFocus
            aria-invalid={Boolean(errors.label)}
            {...register('label')}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="enlace-url">Dirección</Label>
        <Input
          id="enlace-url"
          className="font-machine h-10!"
          placeholder="https://"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          aria-invalid={Boolean(errors.url)}
          {...register('url')}
        />
        <FieldError message={errors.label?.message ?? errors.url?.message} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pendiente}>
          {pendiente && <Loader2Icon className="animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}
