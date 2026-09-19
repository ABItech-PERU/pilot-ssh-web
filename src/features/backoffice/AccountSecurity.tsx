import {
  MailCheckIcon,
  MailWarningIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserXIcon,
} from 'lucide-react'

import type { PlatformPerson } from '@/types/api'

/** Seguridad de la cuenta en dos líneas. Cada estado con icono y texto:
 *  el color solo no basta. */
export function AccountSecurity({
  persona,
}: {
  persona: Pick<PlatformPerson, 'is_active' | 'has_verified_email' | 'two_factor_enabled'>
}) {
  if (!persona.is_active) {
    return (
      <span className="text-destructive inline-flex items-center gap-1.5 text-xs font-medium">
        <UserXIcon className="size-3.5" />
        Cuenta desactivada
      </span>
    )
  }

  return (
    <span className="flex flex-col gap-0.5 text-xs">
      {persona.has_verified_email ? (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <MailCheckIcon className="size-3.5" />
          Correo confirmado
        </span>
      ) : (
        <span className="text-warning inline-flex items-center gap-1.5">
          <MailWarningIcon className="size-3.5" />
          Correo sin confirmar
        </span>
      )}
      {persona.two_factor_enabled ? (
        <span className="text-success inline-flex items-center gap-1.5">
          <ShieldCheckIcon className="size-3.5" />
          Dos pasos
        </span>
      ) : (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <ShieldAlertIcon className="size-3.5" />
          Sin dos pasos
        </span>
      )}
    </span>
  )
}
