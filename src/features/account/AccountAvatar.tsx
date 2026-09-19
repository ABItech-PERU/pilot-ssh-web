import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CameraIcon, ExpandIcon, ImageIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { AvatarCropDialog } from '@/components/avatar-crop-dialog'
import { AvatarViewerDialog } from '@/components/avatar-viewer-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { buildInitials } from '@/lib/format'
import type { CurrentUser } from '@/types/api'

interface Props {
  user: CurrentUser
}

/** Foto de la cuenta; se cambia desde la propia foto, donde se busca. */
export function AccountAvatar({ user }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [aRecortar, setARecortar] = useState<string | null>(null)
  const [mirando, setMirando] = useState(false)
  const imagen = useAvatar(() => setARecortar(null))

  const elegir = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    // Limpio: elegir el mismo archivo vuelve a disparar el cambio
    evento.target.value = ''
    if (archivo) setARecortar(URL.createObjectURL(archivo))
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group focus-visible:outline-ring relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label="Cambiar la foto"
          >
            <Avatar className="size-20">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
              <AvatarFallback className="text-xl font-semibold">
                {buildInitials(user.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon className="size-6" />
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          {user.avatar_url && (
            <DropdownMenuItem onSelect={() => setMirando(true)}>
              <ExpandIcon />
              Ver la foto
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => entrada.current?.click()}>
            <ImageIcon />
            {user.avatar_url ? 'Cambiar la foto' : 'Subir una foto'}
          </DropdownMenuItem>
          {user.avatar_url && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => imagen.quitar.mutate()}
            >
              <Trash2Icon />
              Quitar la foto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={elegir}
      />

      {user.avatar_url && (
        <AvatarViewerDialog
          imagen={user.avatar_url}
          titulo={`Foto de ${user.display_name}`}
          open={mirando}
          onOpenChange={setMirando}
        />
      )}

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

function useAvatar(alTerminar: () => void) {
  const cliente = useQueryClient()
  const [aviso, setAviso] = useState<string | null>(null)

  const refrescar = async () => {
    await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
    setAviso(null)
    alTerminar()
  }

  const subir = useMutation({
    mutationFn: (recorte: Blob) => {
      setAviso(null)
      return authApi.uploadAvatar(recorte)
    },
    onSuccess: async () => {
      await refrescar()
      toast.success('Foto actualizada.')
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  const quitar = useMutation({
    mutationFn: authApi.deleteAvatar,
    onSuccess: async () => {
      await refrescar()
      toast.success('Foto quitada.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return { subir, quitar, aviso }
}
