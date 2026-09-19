import { ShieldAlertIcon, ShieldCheckIcon, UserCogIcon } from 'lucide-react'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { TituloDeBloque } from '@/features/backoffice/OrganizationFacts'
import { PERMISOS } from '@/features/backoffice/permisos'
import { PersonIdentity } from '@/features/backoffice/PersonIdentity'
import { Dato, EstadoBadge } from '@/features/credits/partes'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { StaffMember } from '@/types/api'

interface Props {
  miembro: StaffMember | null
  /** Los propios permisos los cambia otra persona del personal. */
  esPropio: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCambiarPermisos: (miembro: StaffMember) => void
}

/** Permisos y acceso de alguien del personal. Cada permiso con lo que
 *  abre: en la fila solo cabe su nombre. */
export function StaffPanel({
  miembro,
  esPropio,
  open,
  onOpenChange,
  onCambiarPermisos,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">Personal</SheetTitle>
          <SheetDescription>
            Qué puede hacer en el panel y si puede entrar.
          </SheetDescription>
        </SidePanelHeader>

        {miembro && (
          <SidePanelBody>
            <div className="border-b px-5 py-4">
              <PersonIdentity persona={miembro} grande />
            </div>

            <TituloDeBloque className="px-5 pt-4 pb-2">Permisos</TituloDeBloque>
            <ul className="space-y-2 border-b px-5 pb-4">
              {PERMISOS.map(({ clave, nombre, ayuda, icono: Icono }) => {
                const tiene = miembro[clave]
                return (
                  <li
                    key={clave}
                    className={
                      tiene
                        ? 'flex gap-3 rounded-lg border p-3'
                        : 'flex gap-3 rounded-lg border border-dashed p-3 opacity-60'
                    }
                  >
                    <Icono className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {nombre}
                        {!tiene && (
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            · Sin este permiso
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground block text-xs">{ayuda}</span>
                    </span>
                  </li>
                )
              })}
            </ul>

            <TituloDeBloque className="px-5 pt-4 pb-1">Acceso al panel</TituloDeBloque>
            <dl className="divide-y">
              <Dato etiqueta="Dos pasos">
                {miembro.two_factor_enabled ? (
                  <span className="text-success inline-flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-4" />
                    Activada
                  </span>
                ) : (
                  <span className="block">
                    <span className="text-warning inline-flex items-center gap-1.5">
                      <ShieldAlertIcon className="size-4" />
                      Sin activar
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      No entra al panel hasta activarlos
                    </span>
                  </span>
                )}
              </Dato>
              <Dato etiqueta="Cuenta">
                <EstadoBadge
                  tono={miembro.is_active ? 'ok' : 'peligro'}
                  etiqueta={miembro.is_active ? 'Activa' : 'Desactivada'}
                />
              </Dato>
              <Dato etiqueta="Último uso">
                {miembro.last_seen_at ? (
                  <span className="block">
                    <span className="block">{formatRelative(miembro.last_seen_at)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {formatDateTime(miembro.last_seen_at)}
                    </span>
                  </span>
                ) : (
                  'Nunca'
                )}
              </Dato>
              <Dato etiqueta="Alta">{formatDateTime(miembro.date_joined)}</Dato>
            </dl>
          </SidePanelBody>
        )}

        {miembro && (
          <SidePanelFooter>
            {/* Sin cambio propio: el servidor lo rechaza */}
            {!esPropio && (
              <Button className="flex-1" onClick={() => onCambiarPermisos(miembro)}>
                <UserCogIcon />
                Cambiar permisos
              </Button>
            )}
          </SidePanelFooter>
        )}
      </SidePanelContent>
    </Sheet>
  )
}
