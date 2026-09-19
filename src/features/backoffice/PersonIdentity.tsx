import { cn } from 'cn'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buildInitials } from '@/lib/format'
import type { PlatformPerson } from '@/types/api'

/** Foto, nombre y correo, para filas de tabla y cabeceras de panel. */
export function PersonIdentity({
  persona,
  grande = false,
  className,
}: {
  persona: Pick<PlatformPerson, 'display_name' | 'email' | 'avatar_url'>
  grande?: boolean
  className?: string
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar className={cn('shrink-0', grande ? 'size-11' : 'size-8')}>
        {persona.avatar_url && <AvatarImage src={persona.avatar_url} alt="" />}
        <AvatarFallback className="text-xs font-semibold">
          {buildInitials(persona.display_name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className={cn('block truncate font-medium', grande && 'text-base')}>
          {persona.display_name}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {persona.email}
        </span>
      </span>
    </span>
  )
}
