import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { AlertCircleIcon, CheckIcon, Loader2Icon, UploadIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ColorPicker } from '@/components/color-picker'
import { FormDialogContent } from '@/components/form-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/field-error'
import * as organizationsApi from '@/features/organizations/api'
import { AvatarCropDialog } from '@/components/avatar-crop-dialog'
import { buildAvatarClasses, buildInitial } from '@/features/organizations/avatar'
import { setCurrentOrganizationSlug } from '@/features/organizations/current'
import { toApiError } from '@/lib/api-error'
import { buildSlug } from '@/lib/slug'
import type { Organization, PaletteColor } from '@/types/api'

const MS_ESPERA = 350

/** Un dato por diálogo: se viene a cambiar uno, sin repasar los demás. */
interface Props {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrganizationNameDialog({ organization, open, onOpenChange }: Props) {
  const [nombre, setNombre] = useState(organization.name)
  const guardar = useGuardar(organization, () => onOpenChange(false))

  useEffect(() => {
    if (open) setNombre(organization.name)
  }, [open, organization.name])

  const limpio = nombre.trim()

  return (
    <Marco
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cambiar el nombre"
      descripcion="Aparece en la barra lateral y en las invitaciones."
      aviso={guardar.aviso}
      pendiente={guardar.mutation.isPending}
      puedeGuardar={limpio.length > 0 && limpio !== organization.name}
      onGuardar={() => guardar.mutation.mutate({ name: limpio })}
    >
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          value={nombre}
          autoComplete="off"
          autoFocus
          onChange={(evento) => setNombre(evento.target.value)}
        />
        {limpio.length === 0 && <FieldError message="El nombre no puede quedar vacío." />}
      </div>
    </Marco>
  )
}

export function OrganizationAddressDialog({ organization, open, onOpenChange }: Props) {
  const [direccion, setDireccion] = useState(organization.slug)
  const [consultada, setConsultada] = useState(organization.slug)
  const guardar = useGuardar(organization, () => onOpenChange(false))

  useEffect(() => {
    if (open) setDireccion(organization.slug)
  }, [open, organization.slug])

  useEffect(() => {
    const temporizador = window.setTimeout(() => setConsultada(direccion), MS_ESPERA)
    return () => window.clearTimeout(temporizador)
  }, [direccion])

  const sinCambios = consultada === organization.slug
  const disponibilidad = useQuery({
    queryKey: ['organizations', 'slug-disponible', consultada],
    queryFn: () => organizationsApi.checkSlugAvailability(consultada),
    enabled: open && consultada.length > 0 && !sinCambios,
    staleTime: 30_000,
  })

  const libre = sinCambios || disponibilidad.data?.available === true
  const propuestas = disponibilidad.data?.suggestions ?? []

  return (
    <Marco
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cambiar la dirección"
      descripcion="Aparece en cada enlace. La anterior queda reservada."
      aviso={guardar.aviso}
      pendiente={guardar.mutation.isPending}
      puedeGuardar={libre && !sinCambios && direccion.length > 0}
      onGuardar={() => guardar.mutation.mutate({ slug: direccion })}
    >
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          value={direccion}
          className="font-machine"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          aria-invalid={!libre}
          onChange={(evento) => setDireccion(buildSlug(evento.target.value))}
        />
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {disponibilidad.isFetching ? (
            <>
              <Loader2Icon className="size-3 animate-spin" />
              Comprobando si está libre
            </>
          ) : sinCambios ? (
            'Con letras, números y guiones.'
          ) : libre ? (
            <>
              <CheckIcon className="text-success size-3.5" />
              Está libre.
            </>
          ) : (
            <span className="text-destructive">
              {disponibilidad.data?.reason ?? 'Esa dirección no está disponible.'}
            </span>
          )}
        </p>

        {!libre && !disponibilidad.isFetching && propuestas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">Libres, para elegir:</p>
            {/* Lista, no botones: nombres que se leen antes de decidir */}
            <ul className="divide-y overflow-hidden rounded-lg border">
              {propuestas.map((propuesta) => (
                <li key={propuesta}>
                  <button
                    type="button"
                    onClick={() => setDireccion(propuesta)}
                    className="hover:bg-accent focus-visible:outline-ring flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1"
                  >
                    <span className="font-machine truncate text-xs">{propuesta}</span>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      Libre
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Marco>
  )
}

export function OrganizationColorDialog({ organization, open, onOpenChange }: Props) {
  const [color, setColor] = useState<PaletteColor>(organization.color)
  const [aRecortar, setARecortar] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const guardar = useGuardar(organization, () => onOpenChange(false))
  const imagen = useAvatarImagen(organization, () => {
    setARecortar(null)
    onOpenChange(false)
  })

  useEffect(() => {
    if (open) setColor(organization.color)
  }, [open, organization.color])

  // La URL local del archivo ocupa memoria hasta revocarla
  useEffect(
    () => () => {
      if (aRecortar) URL.revokeObjectURL(aRecortar)
    },
    [aRecortar],
  )

  const elegir = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const elegido = evento.target.files?.[0]
    if (elegido) setARecortar(URL.createObjectURL(elegido))
    // Limpio: elegir la misma imagen vuelve a disparar el cambio
    evento.target.value = ''
  }

  return (
    <>
      <Marco
        open={open && !aRecortar}
        onOpenChange={onOpenChange}
        titulo="Cambiar el avatar"
        descripcion="Una imagen, o un color con la inicial del nombre."
        aviso={guardar.aviso ?? imagen.aviso}
        pendiente={guardar.mutation.isPending}
        puedeGuardar={color !== organization.color}
        onGuardar={() => guardar.mutation.mutate({ color })}
      >
        <div className="flex items-center gap-4">
          {organization.avatar_url ? (
            <img
              src={organization.avatar_url}
              alt=""
              className="size-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span
              className={cn(
                'grid size-14 shrink-0 place-items-center rounded-xl text-lg font-semibold transition-colors',
                buildAvatarClasses(color),
              )}
              aria-hidden
            >
              {buildInitial(organization.name)}
            </span>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => archivo.current?.click()}>
              <UploadIcon />
              Subir imagen
            </Button>
            {organization.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                disabled={imagen.quitar.isPending}
                onClick={() => imagen.quitar.mutate()}
              >
                Quitar imagen
              </Button>
            )}
            <input
              ref={archivo}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={elegir}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <ColorPicker color={color} descripcion="Color del avatar" onChange={setColor} />
          {organization.avatar_url && (
            <p className="text-muted-foreground text-xs">
              Con una imagen puesta, el color no se muestra.
            </p>
          )}
        </div>
      </Marco>

      {aRecortar && (
        <AvatarCropDialog
          imagen={aRecortar}
          open
          aviso={imagen.aviso}
          pendiente={imagen.subir.isPending}
          onOpenChange={(abierto) => !abierto && setARecortar(null)}
          onGuardar={(recorte) => imagen.subir.mutate(recorte)}
        />
      )}
    </>
  )
}

/** Aparte del resto: multipart y una petición propia cada una. */
function useAvatarImagen(organization: Organization, alTerminar: () => void) {
  const cliente = useQueryClient()
  const [aviso, setAviso] = useState<string | null>(null)

  const refrescar = async () => {
    await cliente.invalidateQueries()
    setAviso(null)
    alTerminar()
  }

  const subir = useMutation({
    mutationFn: (recorte: Blob) => {
      setAviso(null)
      return organizationsApi.uploadAvatar(organization.slug, recorte)
    },
    onSuccess: async () => {
      await refrescar()
      toast.success('Avatar actualizado.')
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const quitar = useMutation({
    mutationFn: () => organizationsApi.deleteAvatar(organization.slug),
    onSuccess: async () => {
      await refrescar()
      toast.success('Imagen quitada.')
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  return { subir, quitar, aviso }
}

/** Guardado común a los tres diálogos: una sola invalidación. */
function useGuardar(organization: Organization, alTerminar: () => void) {
  const cliente = useQueryClient()
  const [aviso, setAviso] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (datos: { name?: string; slug?: string; color?: PaletteColor }) =>
      organizationsApi.updateOrganization(organization.slug, datos),
    onSuccess: async (guardada) => {
      // Si cambia la dirección, se vuelve a pedir todo lo que cuelga de ella
      setCurrentOrganizationSlug(guardada.slug)
      await cliente.invalidateQueries()
      toast.success('Organización actualizada.')
      setAviso(null)
      alTerminar()
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  return { mutation, aviso }
}

function Marco({
  open,
  onOpenChange,
  titulo,
  descripcion,
  aviso,
  pendiente,
  puedeGuardar,
  onGuardar,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  descripcion: string
  aviso: string | null
  pendiente: boolean
  puedeGuardar: boolean
  onGuardar: () => void
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        {children}

        <DialogFooter>
          <Button disabled={!puedeGuardar || pendiente} onClick={onGuardar}>
            {pendiente && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
