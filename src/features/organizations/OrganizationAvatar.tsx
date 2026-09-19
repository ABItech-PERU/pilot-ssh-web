import { cn } from 'cn'

import { buildAvatarClasses, buildInitial } from '@/features/organizations/avatar'
import type { OrganizationSummary } from '@/types/api'

const TAMANOS = {
  sm: 'size-8 rounded-md text-xs',
  md: 'size-10 rounded-lg text-sm',
  lg: 'size-12 rounded-xl text-base',
} as const

/** Filo interior del color del borde: separa el avatar del fondo claro y
 *  recorta el canto de la imagen. `outline`, no sombra interior, que queda
 *  bajo la imagen. Igual que los avatares de persona en `index.css`. */
const FILO = 'outline-1 -outline-offset-1 outline-border'

/** Color e inicial: el color se reconoce antes de leer el nombre. */
export function OrganizationAvatar({
  organization,
  tamano = 'sm',
  className,
}: {
  organization: Pick<OrganizationSummary, 'name' | 'color' | 'avatar_url'>
  tamano?: keyof typeof TAMANOS
  className?: string
}) {
  if (organization.avatar_url) {
    return (
      <img
        src={organization.avatar_url}
        alt=""
        className={cn('shrink-0 object-cover', FILO, TAMANOS[tamano], className)}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center font-semibold',
        FILO,
        buildAvatarClasses(organization.color),
        TAMANOS[tamano],
        className,
      )}
    >
      {buildInitial(organization.name)}
    </span>
  )
}
