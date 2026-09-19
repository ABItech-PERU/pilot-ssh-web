import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UserMinusIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as accessApi from '@/features/access/api'
import { GroupNameDialog } from '@/features/access/GroupNameDialog'
import { MemberAccessSheet } from '@/features/access/MemberAccessSheet'
import * as membersApi from '@/features/members/api'
import { ROLES, ROLES_QUE_SE_ASIGNAN } from '@/features/members/roles'
import { toApiError } from '@/lib/api-error'
import type { AccessGroup, Membership, OrganizationRole } from '@/types/api'

interface Props {
  slug: string
  miembro: Membership
  esUsted: boolean
}

/** Rol y grupos se cambian desde la fila, sin diálogo ni cambio de
 *  pestaña. Quitar de la organización sí confirma. */
export function MemberActions({ slug, miembro, esUsted }: Props) {
  const cliente = useQueryClient()
  const [quitando, setQuitando] = useState(false)
  const [viendoAccesos, setViendoAccesos] = useState(false)
  // Sin grupos, se crea uno desde aquí y la persona entra al momento
  const [creandoGrupo, setCreandoGrupo] = useState(false)

  const refrescar = async () => {
    await cliente.invalidateQueries({ queryKey: ['members'] })
    await accessApi.invalidarAcceso(cliente)
  }

  const cambiar = useMutation({
    mutationFn: (rol: OrganizationRole) => membersApi.changeRole(slug, miembro.id, rol),
    onSuccess: async (actualizado) => {
      await refrescar()
      toast.success(
        `${actualizado.display_name} ahora es ${ROLES[actualizado.role].etiqueta}.`,
      )
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const quitar = useMutation({
    mutationFn: () => membersApi.removeMember(slug, miembro.id),
    onSuccess: async () => {
      await refrescar()
      setQuitando(false)
      toast.success(`${miembro.display_name} ya no está en la organización.`)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  // Misma clave que la pestaña de grupos: sin una petición por fila
  const grupos = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(slug),
    queryFn: () => accessApi.fetchGroups(slug),
  })

  const cambiarGrupo = useMutation({
    mutationFn: async ({ grupo, dentro }: { grupo: AccessGroup; dentro: boolean }) => {
      if (dentro) await accessApi.addToGroup(grupo.id, miembro.id)
      else await accessApi.removeFromGroup(grupo.id, miembro.id)
    },
    onSuccess: async (_, { grupo, dentro }) => {
      await accessApi.invalidarAcceso(cliente)
      toast.success(
        dentro
          ? `${miembro.display_name} entra en ${grupo.name}.`
          : `${miembro.display_name} sale de ${grupo.name}.`,
      )
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const suyos = new Set(
    (grupos.data ?? [])
      .filter((grupo) => grupo.members.some((uno) => uno.membership === miembro.id))
      .map((grupo) => grupo.id),
  )

  // Propietario y uno mismo: no se ofrece lo que el backend rechaza
  const intocable = esUsted || miembro.role === 'owner'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${miembro.display_name}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setViendoAccesos(true)}>
            <KeyRoundIcon />
            Ver sus accesos
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UsersIcon />
              Grupos de acceso
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-60 overflow-y-auto">
              {grupos.isPending ? (
                <DropdownMenuItem disabled>Cargando grupos…</DropdownMenuItem>
              ) : (grupos.data ?? []).length === 0 ? (
                <DropdownMenuLabel className="text-muted-foreground font-normal">
                  Todavía no hay grupos.
                </DropdownMenuLabel>
              ) : (
                (grupos.data ?? []).map((grupo) => (
                  <DropdownMenuCheckboxItem
                    key={grupo.id}
                    checked={suyos.has(grupo.id)}
                    disabled={cambiarGrupo.isPending}
                    // Menú abierto: se suele tocar más de uno
                    onSelect={(evento) => evento.preventDefault()}
                    onCheckedChange={(marcado) =>
                      cambiarGrupo.mutate({ grupo, dentro: marcado })
                    }
                  >
                    {grupo.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
              {!grupos.isPending && (
                <>
                  {(grupos.data ?? []).length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onSelect={() => setCreandoGrupo(true)}>
                    <PlusIcon />
                    {(grupos.data ?? []).length === 0
                      ? 'Crear el primero'
                      : 'Nuevo grupo'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Rol en la organización</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={miembro.role}
            onValueChange={(valor) => cambiar.mutate(valor as OrganizationRole)}
          >
            {ROLES_QUE_SE_ASIGNAN.map((clave) => (
              <DropdownMenuRadioItem
                key={clave}
                value={clave}
                disabled={intocable}
                className="items-start"
              >
                <span className="min-w-0">
                  <span className="block">{ROLES[clave].etiqueta}</span>
                  {/* Alcance del rol antes de elegirlo: administrador da
                      acceso a todo */}
                  <span className="text-muted-foreground block text-xs">
                    {ROLES[clave].alcance}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={intocable}
            onSelect={() => setQuitando(true)}
          >
            <UserMinusIcon />
            Quitar de la organización
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MemberAccessSheet
        slug={slug}
        miembro={miembro}
        open={viendoAccesos}
        onOpenChange={setViendoAccesos}
      />

      <GroupNameDialog
        slug={slug}
        grupo={null}
        open={creandoGrupo}
        onOpenChange={setCreandoGrupo}
        onCreado={(grupo) => cambiarGrupo.mutate({ grupo, dentro: true })}
      />

      <ConfirmDialog
        open={quitando}
        onOpenChange={setQuitando}
        titulo={`¿Quitar a ${miembro.display_name}?`}
        descripcion="Deja de ver esta organización en cuanto se aplique."
        detalles={[
          'Pierde el acceso a los servidores y credenciales de aquí',
          'Se quitan los accesos que se le dieron a su nombre',
          'Sus sesiones de terminal abiertas dejan de servir',
          'Puede volver con una invitación nueva, sin sus accesos de antes',
        ]}
        accion="Quitar"
        destructiva
        pendiente={quitar.isPending}
        onConfirmar={() => quitar.mutate()}
      />
    </>
  )
}
