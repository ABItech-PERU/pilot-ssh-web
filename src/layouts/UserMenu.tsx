import { cn } from 'cn'
import {
  ChevronsUpDownIcon,
  HistoryIcon,
  LayoutGridIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from '@/features/auth/session'
import { esPersonal } from '@/features/backoffice/permisos'
import { RUTA_DE_PLATAFORMA } from '@/features/backoffice/rutas'
import { buildInitials } from '@/lib/format'

interface Props {
  /** Solo el avatar: en el carril y la cabecera móvil no cabe el nombre. */
  compacto?: boolean
  className?: string
}

/** Cuenta y salida, al pie de la barra: donde se busca por convención. */
export function UserMenu({ compacto = false, className }: Props) {
  const { user, signOut } = useSession()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const enPlataforma = pathname.startsWith(RUTA_DE_PLATAFORMA)

  if (!user) return null

  const cerrarSesion = async () => {
    await signOut()
    navegar('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            compacto
              ? 'size-10 rounded-full p-0'
              : 'h-auto w-full justify-between gap-2 px-2 py-2 text-left',
            className,
          )}
          aria-label={compacto ? 'Tu cuenta' : undefined}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-8">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
              <AvatarFallback className="text-xs font-semibold">
                {buildInitials(user.display_name)}
              </AvatarFallback>
            </Avatar>
            {!compacto && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {user.display_name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {user.email}
                </span>
              </span>
            )}
          </span>
          {!compacto && (
            <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold">
            {user.display_name}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Atajo del personal entre su panel y la plataforma: junto a la
            cuenta, porque es de la persona, no de la organización */}
        {esPersonal(user) && (
          <>
            {enPlataforma ? (
              <DropdownMenuItem onSelect={() => navegar('/app/servers')}>
                <LayoutGridIcon className="size-4" />
                Mi panel
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => navegar(RUTA_DE_PLATAFORMA)}>
                <ShieldCheckIcon className="size-4" />
                Panel de plataforma
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => navegar('/app/settings')}>
          <SettingsIcon className="size-4" />
          Configuración
        </DropdownMenuItem>
        {/* Junto a la cuenta: aquí la busca quien sospecha un acceso ajeno */}
        <DropdownMenuItem onSelect={() => navegar('/app/settings/activity')}>
          <HistoryIcon className="size-4" />
          Actividad de la cuenta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={cerrarSesion}>
          <LogOutIcon className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
