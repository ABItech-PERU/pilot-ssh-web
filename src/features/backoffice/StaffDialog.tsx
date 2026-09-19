import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon, ShieldAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ChoiceCard } from '@/components/choice-card'
import { FieldError } from '@/components/field-error'
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
import * as platformApi from '@/features/backoffice/api'
import { PERMISOS } from '@/features/backoffice/permisos'
import { PersonIdentity } from '@/features/backoffice/PersonIdentity'
import { toApiError } from '@/lib/api-error'
import type { StaffCapabilitiesInput, StaffMember } from '@/types/api'

interface Props {
  /** Null: alta de alguien nuevo por su correo. */
  miembro: StaffMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NINGUNO: StaffCapabilitiesInput = {
  can_attend_customers: false,
  can_manage_finances: false,
  can_manage_staff: false,
}

/** Permisos combinables: en un equipo pequeño la misma persona atiende y
 *  cobra sin tenerlo todo. */
export function StaffDialog({ miembro, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [correo, setCorreo] = useState('')
  const [permisos, setPermisos] = useState<StaffCapabilitiesInput>(NINGUNO)

  const guardar = useMutation({
    mutationFn: () =>
      miembro
        ? platformApi.updateStaff(miembro.id, permisos)
        : platformApi.addStaff(correo.trim(), permisos),
    onSuccess: async (guardado) => {
      await cliente.invalidateQueries({
        queryKey: platformApi.clavesPlataforma.todoElPersonal(),
      })
      onOpenChange(false)
      toast.success(
        miembro
          ? `Permisos de ${guardado.display_name} guardados.`
          : `${guardado.display_name} añadido al personal.`,
      )
    },
  })

  useEffect(() => {
    if (!open) return
    setCorreo('')
    setPermisos(
      miembro
        ? {
            can_attend_customers: miembro.can_attend_customers,
            can_manage_finances: miembro.can_manage_finances,
            can_manage_staff: miembro.can_manage_staff,
          }
        : NINGUNO,
    )
  }, [open, miembro])

  const cambiarApertura = (abierto: boolean) => {
    // Cada apertura empieza sin el fallo anterior
    if (!abierto) guardar.reset()
    onOpenChange(abierto)
  }

  const error = guardar.error ? toApiError(guardar.error) : null
  const errorDelCorreo = error?.fieldErrors.email?.[0]
  const alguno = Object.values(permisos).some(Boolean)
  const listo = alguno && (miembro !== null || correo.trim() !== '')

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>{miembro ? 'Cambiar permisos' : 'Añadir al personal'}</DialogTitle>
          <DialogDescription>
            {miembro
              ? 'Se le avisa por correo y queda en la actividad del personal.'
              : 'A alguien que ya tiene cuenta en Pilot SSH.'}
          </DialogDescription>
        </DialogHeader>

        {error && !errorDelCorreo && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {miembro ? (
          <div className="rounded-lg border p-3">
            <PersonIdentity persona={miembro} />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="correo-del-personal">Correo de su cuenta</Label>
            <Input
              id="correo-del-personal"
              type="email"
              autoComplete="off"
              autoFocus
              placeholder="nombre@correo.com"
              value={correo}
              aria-invalid={Boolean(errorDelCorreo)}
              onChange={(evento) => {
                setCorreo(evento.target.value)
                guardar.reset()
              }}
            />
            <FieldError message={errorDelCorreo} />
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Permisos</legend>
          <div className="grid gap-2">
            {PERMISOS.map((permiso) => (
              <ChoiceCard
                key={permiso.clave}
                tipo="casilla"
                elegida={permisos[permiso.clave]}
                titulo={permiso.nombre}
                pie={permiso.ayuda}
                onClick={() =>
                  setPermisos((actuales) => ({
                    ...actuales,
                    [permiso.clave]: !actuales[permiso.clave],
                  }))
                }
              />
            ))}
          </div>
        </fieldset>

        {miembro && !miembro.two_factor_enabled && (
          <p className="text-warning flex items-start gap-2 text-sm">
            <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
            Sin dos pasos no entrará al panel hasta activarlos.
          </p>
        )}

        <DialogFooter>
          <Button disabled={!listo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2Icon className="animate-spin" />}
            {miembro ? 'Guardar permisos' : 'Añadir al personal'}
          </Button>
          <Button variant="outline" onClick={() => cambiarApertura(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
