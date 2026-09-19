import { BuildingIcon, IdCardIcon, ServerIcon, TagIcon } from 'lucide-react'

import type { AccessGrant } from '@/types/api'

/** Solo el nombre: el tipo de alcance lo dice el icono que lo acompaña. */
export function describirAlcance(concesion: AccessGrant): string {
  switch (concesion.scope) {
    case 'organization':
      return 'Toda la organización'
    case 'label':
    case 'credential':
      return concesion.scope_label
    default:
      return concesion.server_name ?? 'Un servidor'
  }
}

/** Credencial sin llave ni candado: esos iconos indican como entra
 *  (clave o llave), no el alcance. */
export const ICONO_DEL_ALCANCE: Record<AccessGrant['scope'], React.ElementType> = {
  organization: BuildingIcon,
  label: TagIcon,
  server: ServerIcon,
  credential: IdCardIcon,
}
