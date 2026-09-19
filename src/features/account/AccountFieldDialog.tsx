import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { PhoneField } from '@/components/phone-field'
import { SelectorDeZona } from '@/components/selector-de-zona'
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
import * as authApi from '@/features/auth/api'
import { CLAVE_USUARIO, useSession } from '@/features/auth/session'
import { toApiError } from '@/lib/api-error'
import { telefonoValido } from '@/lib/telefonos'
import { zonaDelNavegador } from '@/lib/zona-horaria'
import type { CurrentUser } from '@/types/api'

interface Props {
  user: CurrentUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AccountNameDialog({ user, open, onOpenChange }: Props) {
  const [nombre, setNombre] = useState(user.full_name)
  const guardar = useGuardarPerfil(() => onOpenChange(false))

  useEffect(() => {
    if (open) setNombre(user.full_name)
  }, [open, user.full_name])

  const limpio = nombre.trim()

  return (
    <Marco
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cambiar el nombre"
      descripcion="Aparece en el registro de sesiones que ve el equipo."
      aviso={guardar.aviso}
      pendiente={guardar.mutation.isPending}
      puedeGuardar={limpio.length > 0 && limpio !== user.full_name}
      onGuardar={() => guardar.mutation.mutate({ full_name: limpio })}
    >
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre y apellidos</Label>
        <Input
          id="full_name"
          value={nombre}
          autoComplete="off"
          autoFocus
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>
    </Marco>
  )
}

export function AccountPhoneDialog({ user, open, onOpenChange }: Props) {
  const [telefono, setTelefono] = useState(user.phone)
  const guardar = useGuardarPerfil(() => onOpenChange(false))

  useEffect(() => {
    if (open) setTelefono(user.phone)
  }, [open, user.phone])

  // El campo ya compone prefijo y número
  const limpio = telefono.trim()

  return (
    <Marco
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cambiar el teléfono"
      descripcion="Para avisos urgentes y para coordinar el cobro de las recargas."
      aviso={guardar.aviso}
      pendiente={guardar.mutation.isPending}
      puedeGuardar={limpio !== user.phone && (limpio === '' || telefonoValido(limpio))}
      onGuardar={() => guardar.mutation.mutate({ phone: limpio })}
    >
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono o WhatsApp</Label>
        <PhoneField id="phone" valor={telefono} onChange={setTelefono} autoFocus />
        <p className="text-muted-foreground text-xs">Puede dejarse en blanco.</p>
      </div>
    </Marco>
  )
}

/** Cierra la sesión en todas partes, también aquí: quien robó la clave no
 *  sigue dentro con su token. */
export function AccountPasswordDialog({ open, onOpenChange }: Omit<Props, 'user'>) {
  const { signOut } = useSession()
  const navegar = useNavigate()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setActual('')
      setNueva('')
      setAviso(null)
    }
  }, [open])

  const cambiar = useMutation({
    mutationFn: () =>
      authApi.changePassword({ current_password: actual, new_password: nueva }),
    onSuccess: async () => {
      await signOut()
      toast.success('Contraseña actualizada. Vuelva a iniciar sesión.')
      navegar('/login', { replace: true })
    },
    onError: (error) => setAviso(toApiError(error).message),
  })

  return (
    <Marco
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cambiar la contraseña"
      descripcion="Se cerrarán todas las sesiones abiertas, también la de este equipo."
      aviso={aviso}
      pendiente={cambiar.isPending}
      puedeGuardar={actual.length > 0 && nueva.length >= 8}
      onGuardar={() => cambiar.mutate()}
    >
      <div className="space-y-2">
        <Label htmlFor="actual">Contraseña actual</Label>
        <PasswordInput
          id="actual"
          value={actual}
          autoComplete="off"
          autoFocus
          onChange={(evento) => setActual(evento.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nueva">Contraseña nueva</Label>
        <PasswordInput
          id="nueva"
          value={nueva}
          autoComplete="off"
          onChange={(evento) => setNueva(evento.target.value)}
        />
        <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
      </div>
    </Marco>
  )
}

/** Arriba, la zona actual y la del equipo: las más elegidas. */
export function AccountTimeZoneDialog({ user, open, onOpenChange }: Props) {
  const detectada = zonaDelNavegador()
  const actual = user.time_zone || detectada
  const [elegida, setElegida] = useState(actual)
  const guardar = useGuardarPerfil(() => onOpenChange(false))

  useEffect(() => {
    if (open) setElegida(actual)
  }, [open, actual])

  return (
    <Marco
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cambiar la zona horaria"
      descripcion="Las horas de toda la aplicación se leerán en ella."
      aviso={guardar.aviso}
      pendiente={guardar.mutation.isPending}
      puedeGuardar={elegida !== user.time_zone}
      onGuardar={() => guardar.mutation.mutate({ time_zone: elegida })}
    >
      {open && (
        <SelectorDeZona
          elegida={elegida}
          onElegir={setElegida}
          centrada={actual}
          sugeridas={[
            { nombre: actual, motivo: 'Actual' },
            ...(detectada === actual ? [] : [{ nombre: detectada, motivo: 'Su equipo' }]),
          ]}
        />
      )}
    </Marco>
  )
}

function useGuardarPerfil(alTerminar: () => void) {
  const cliente = useQueryClient()
  const [aviso, setAviso] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: async () => {
      // `PATCH /me` devuelve el perfil, no la identidad: se invalida en vez
      // de guardarlo, o el selector de organización quedaría vacío
      await cliente.invalidateQueries({ queryKey: CLAVE_USUARIO })
      toast.success('Datos actualizados.')
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
