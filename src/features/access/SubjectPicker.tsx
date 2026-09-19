import { ChevronDownIcon, MailIcon, UserPlusIcon, UsersIcon } from 'lucide-react'

import { SearchMenu, type OpcionDeMenu } from '@/components/search-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Sujeto } from '@/features/access/subject'
import { buildInitials } from '@/lib/format'
import type { AccessGroup, Invitation, Membership } from '@/types/api'

/** Grupos y personas en un solo buscador. Solo el equipo: sin membresía no
 *  se elige la organización y el acceso no se vería. */
export function SubjectPicker({
  id,
  grupos,
  personas,
  invitaciones,
  elegido,
  cargando,
  invalido,
  onElegir,
  onInvitar,
}: {
  id: string
  grupos: AccessGroup[]
  personas: Membership[]
  /** Reciben acceso ya; lo tendrán al aceptar. */
  invitaciones: Invitation[]
  elegido: Sujeto | null
  cargando: boolean
  invalido?: boolean
  onElegir: (sujeto: Sujeto) => void
  onInvitar: () => void
}) {
  const opciones: OpcionDeMenu[] = [
    ...grupos.map((grupo) => ({
      clave: `grupo:${grupo.id}`,
      nombre: grupo.name,
      detalle: contarPersonas(grupo.members.length),
      icono: UsersIcon,
      seccion: 'Grupos',
    })),
    ...personas.map((miembro) => ({
      clave: `persona:${miembro.email}`,
      nombre: miembro.display_name,
      detalle: miembro.email,
      avatar: miembro.avatar_url,
      seccion: 'Personas',
    })),
    // Invitaciones pendientes: el acceso se reparte ya y aplica al aceptar
    ...invitaciones.map((invitacion) => ({
      clave: `invitacion:${invitacion.email}`,
      nombre: invitacion.email,
      detalle: 'Lo tendrá en cuanto acepte la invitación',
      icono: MailIcon,
      seccion: 'Invitaciones sin aceptar',
    })),
  ]

  const elegir = (clave: string) => {
    const [tipo, valor = ''] = clave.split(/:(.*)/s)

    if (tipo === 'grupo') {
      const grupo = grupos.find((fila) => fila.id === valor)
      if (grupo) onElegir({ tipo: 'grupo', id: grupo.id, nombre: grupo.name })
      return
    }

    // Invitacion por correo, como un miembro: el backend resuelve si ya
    // acepto
    if (tipo === 'invitacion') {
      onElegir({ tipo: 'persona', email: valor, nombre: valor, avatar: null })
      return
    }

    const miembro = personas.find((fila) => fila.email === valor)
    if (miembro) {
      onElegir({
        tipo: 'persona',
        email: miembro.email,
        nombre: miembro.display_name,
        avatar: miembro.avatar_url,
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          variant="outline"
          size="lg"
          className="w-full justify-between px-3 font-normal"
          disabled={cargando}
          aria-invalid={invalido}
        >
          {elegido ? <Elegido sujeto={elegido} /> : <Vacio cargando={cargando} />}
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) p-0"
      >
        <SearchMenu
          opciones={opciones}
          etiqueta="Buscar un grupo o una persona"
          placeholder="Nombre o correo"
          vacio="Todavía no hay nadie más en el equipo."
          onElegir={elegir}
          pie={
            <>
              <DropdownMenuSeparator className="my-0" />
              <div className="p-1">
                <DropdownMenuItem onSelect={onInvitar}>
                  <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
                    <UserPlusIcon className="size-3.5" />
                  </span>
                  Invitar a alguien al equipo
                </DropdownMenuItem>
              </div>
            </>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Elegido({ sujeto }: { sujeto: Sujeto }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {sujeto.tipo === 'grupo' ? (
        <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
          <UsersIcon className="size-3.5" />
        </span>
      ) : (
        <Avatar className="size-6 shrink-0">
          {sujeto.avatar && <AvatarImage src={sujeto.avatar} alt="" />}
          <AvatarFallback className="text-[10px] font-semibold">
            {buildInitials(sujeto.nombre)}
          </AvatarFallback>
        </Avatar>
      )}
      <span className="truncate">{sujeto.nombre}</span>
    </span>
  )
}

function Vacio({ cargando }: { cargando: boolean }) {
  return (
    <span className="text-muted-foreground">
      {cargando ? 'Cargando el equipo…' : 'Elija un grupo o una persona'}
    </span>
  )
}

function contarPersonas(cuantas: number) {
  return cuantas === 1 ? '1 persona' : `${cuantas} personas`
}
