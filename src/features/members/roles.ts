import { ShieldCheckIcon, UserCogIcon, UserIcon } from 'lucide-react'

import type { OrganizationRole } from '@/types/api'

interface Rol {
  etiqueta: string
  /** Qué gestiona, en una línea; se muestra al elegirlo. */
  alcance: string
  icono: React.ElementType
}

/** El rol dice qué gestiona; a qué máquinas entra, sus grupos y lo
 *  compartido. Por eso «solo mirar» es nivel de acceso, no rol. */
export const ROLES: Record<OrganizationRole, Rol> = {
  owner: {
    etiqueta: 'Propietario',
    alcance: 'Manda en todo, incluida la dirección y la baja.',
    icono: ShieldCheckIcon,
  },
  admin: {
    etiqueta: 'Administrador',
    alcance: 'Registra servidores, invita al equipo y reparte accesos.',
    icono: UserCogIcon,
  },
  member: {
    etiqueta: 'Miembro',
    alcance: 'Usa los accesos que reciba. No gestiona la organización.',
    icono: UserIcon,
  },
}

/** El propietario no se reparte desde aquí: se traspasa. */
export const ROLES_QUE_SE_ASIGNAN: OrganizationRole[] = ['admin', 'member']
