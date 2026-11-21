import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRightIcon,
  KeyRoundIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SearchMenu } from '@/components/search-menu'
import { EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as accessApi from '@/features/access/api'
import { NIVELES } from '@/features/access/levels'
import { describirAlcance, ICONO_DEL_ALCANCE } from '@/features/access/scope'
import * as membersApi from '@/features/members/api'
import { toApiError } from '@/lib/api-error'
import { buildInitials } from '@/lib/format'
import { cn } from 'cn'
import type { AccessGrant, AccessGroup, Membership } from '@/types/api'

/** La lista entera vive en su diálogo. */
const ACCESOS_EN_LA_CABECERA = 2

interface Props {
  slug: string
  grupo: AccessGroup
  concesiones: AccessGrant[]
  administra: boolean
  onAccesos: () => void
  onRenombrar: () => void
  onEliminar: () => void
}

/** Miembros al desplegar; alcance resumido aquí y editable en su diálogo. */
export function GroupRow({
  slug,
  grupo,
  concesiones,
  administra,
  onAccesos,
  onRenombrar,
  onEliminar,
}: Props) {
  // Abierta de partida: al entrar se busca quien esta en cada grupo
  const [abierta, setAbierta] = useState(true)

  return (
    <li>
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          aria-expanded={abierta}
          aria-label={`Plegar o desplegar ${grupo.name}`}
          onClick={() => setAbierta((actual) => !actual)}
          className="focus-visible:outline-ring flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:-outline-offset-2 focus-visible:outline-1"
        >
          <ChevronRightIcon
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              abierta && 'rotate-90',
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{grupo.name}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {grupo.members.length === 1
                ? '1 persona'
                : `${grupo.members.length} personas`}
              {grupo.description && ` · ${grupo.description}`}
            </span>
          </span>
        </button>

        <span className="hidden max-w-[22rem] items-center justify-end gap-1 sm:flex">
          {concesiones.length === 0 ? (
            <span className="text-muted-foreground text-xs">Sin accesos</span>
          ) : (
            <>
              {concesiones.slice(0, ACCESOS_EN_LA_CABECERA).map((concesion) => (
                <ChipDeAcceso key={concesion.id} concesion={concesion} />
              ))}
              {concesiones.length > ACCESOS_EN_LA_CABECERA && (
                <span className="text-muted-foreground shrink-0 text-xs">
                  y {concesiones.length - ACCESOS_EN_LA_CABECERA} más
                </span>
              )}
            </>
          )}
        </span>

        {administra && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones de ${grupo.name}`}
              >
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onAccesos}>
                <KeyRoundIcon />
                Accesos del grupo
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onRenombrar}>
                <PencilIcon />
                Cambiar nombre
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onEliminar}>
                <Trash2Icon />
                Eliminar grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {abierta && (
        <Personas
          slug={slug}
          grupo={grupo}
          concesiones={concesiones}
          administra={administra}
        />
      )}
    </li>
  )
}

function ChipDeAcceso({ concesion }: { concesion: AccessGrant }) {
  const Icono = ICONO_DEL_ALCANCE[concesion.scope]
  const alcance = describirAlcance(concesion)

  return (
    // Nombre entero en `title`: en una fila estrecha se corta
    <span
      title={alcance}
      className="bg-secondary text-secondary-foreground inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-xs"
    >
      <Icono className="size-3 shrink-0" />
      <span className="truncate">{alcance}</span>
      <span className="text-muted-foreground shrink-0">
        {NIVELES[concesion.level].etiqueta}
      </span>
    </span>
  )
}

/** Miembros, con alta y baja en el sitio. */
function Personas({
  slug,
  grupo,
  concesiones,
  administra,
}: {
  slug: string
  grupo: AccessGroup
  concesiones: AccessGrant[]
  administra: boolean
}) {
  const cliente = useQueryClient()

  const miembros = useQuery({
    queryKey: membersApi.clavesEquipo.miembros(slug),
    queryFn: () => membersApi.fetchMembers(slug),
    enabled: administra,
  })

  const refrescar = () => accessApi.invalidarAcceso(cliente)

  const meter = useMutation({
    mutationFn: (membresia: string) => accessApi.addToGroup(grupo.id, membresia),
    onSuccess: refrescar,
    onError: (error) => toast.error(toApiError(error).message),
  })

  const sacar = useMutation({
    mutationFn: (membresia: string) => accessApi.removeFromGroup(grupo.id, membresia),
    onSuccess: async (_, membresia) => {
      await refrescar()
      const quien = grupo.members.find((uno) => uno.membership === membresia)
      // Baja sin confirmacion: el aviso ofrece deshacer
      toast.success(`${quien?.display_name ?? 'Ya'} sale de ${grupo.name}.`, {
        action: { label: 'Deshacer', onClick: () => meter.mutate(membresia) },
      })
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const dentro = new Set(grupo.members.map((miembro) => miembro.membership))
  const fuera = (miembros.data ?? []).filter((miembro) => !dentro.has(miembro.id))

  return (
    // Sin marco propio: un recuadro dentro de la lista escalona la pantalla
    <div className="bg-muted/20 border-t">
      {/* En movil el alcance no cabe en la cabecera de la fila */}
      {concesiones.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pt-3 pl-12 sm:hidden">
          {concesiones.map((concesion) => (
            <ChipDeAcceso key={concesion.id} concesion={concesion} />
          ))}
        </div>
      )}

      {grupo.members.length === 0 ? (
        <EmptyState
          compacto
          icon={UsersIcon}
          title="Todavía no hay nadie aquí"
          description={descripcionDelVacio(administra, fuera.length)}
          action={
            administra &&
            fuera.length > 0 && <Anadir fuera={fuera} onElegir={meter.mutate} />
          }
          className="border-0 px-6 py-10"
        />
      ) : (
        <ul className="divide-border/60 divide-y">
          {grupo.members.map((miembro) => (
            <li key={miembro.id} className="flex items-center gap-3 py-2.5 pr-4 pl-12">
              <Avatar className="size-7 shrink-0">
                {miembro.avatar_url && <AvatarImage src={miembro.avatar_url} alt="" />}
                <AvatarFallback className="text-xs font-semibold">
                  {buildInitials(miembro.display_name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{miembro.display_name}</span>
                <span className="text-muted-foreground font-machine block truncate text-xs">
                  {miembro.email}
                </span>
              </span>
              {administra && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar a ${miembro.display_name} del grupo`}
                  disabled={sacar.isPending}
                  onClick={() => sacar.mutate(miembro.membership)}
                >
                  <XIcon className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {administra && fuera.length > 0 && grupo.members.length > 0 && (
        <div className="px-4 py-3 pl-12">
          <Anadir fuera={fuera} onElegir={meter.mutate} />
        </div>
      )}
    </div>
  )
}

function descripcionDelVacio(administra: boolean, fuera: number): string {
  if (!administra) return 'Solo quien administra la organización añade personas.'
  if (fuera === 0) return 'Invite antes a alguien a la organización.'
  return 'Añada a quien deba entrar a lo que alcanza este grupo.'
}

/** Menu y no selector: accion repetible, no un valor. Con buscador y
 *  abierto tras elegir, para añadir varios seguidos.
 *
 *  `outline` como todo lo de una fila: el relleno del acento se reserva a
 *  la accion principal de la pantalla. */
function Anadir({
  fuera,
  onElegir,
}: {
  fuera: Membership[]
  onElegir: (membresia: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlusIcon />
          Añadir a alguien del equipo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-0">
        <SearchMenu
          opciones={fuera.map((miembro) => ({
            clave: miembro.id,
            nombre: miembro.display_name,
            detalle: miembro.email,
            avatar: miembro.avatar_url,
          }))}
          etiqueta="Buscar en el equipo"
          placeholder="Nombre o correo"
          vacio="Ya está todo el equipo en este grupo."
          mantenerAbierto
          onElegir={onElegir}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
