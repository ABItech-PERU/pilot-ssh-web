import { BanknoteIcon, HeadsetIcon, UserCogIcon } from 'lucide-react'

import type { SeccionDePlataforma } from '@/features/backoffice/rutas'
import type { CurrentUser, StaffCapability } from '@/types/api'

type Cuenta = Pick<CurrentUser, StaffCapability | 'two_factor_enabled'> | null | undefined

export interface Permiso {
  clave: StaffCapability
  /** Valor del filtro `capability` del servidor. */
  filtro: 'attend' | 'finance' | 'staff'
  nombre: string
  ayuda: string
  icono: React.ElementType
}

/** En orden de lectura. Se combinan: en un equipo pequeño la misma
 *  persona atiende y cobra. */
export const PERMISOS: Permiso[] = [
  {
    clave: 'can_attend_customers',
    filtro: 'attend',
    nombre: 'Atención',
    ayuda: 'Cuentas de los clientes, diagnóstico de acceso y suspensiones.',
    icono: HeadsetIcon,
  },
  {
    clave: 'can_manage_finances',
    filtro: 'finance',
    nombre: 'Finanzas',
    ayuda: 'Recargas, cobros, créditos, precios y paquetes.',
    icono: BanknoteIcon,
  },
  {
    clave: 'can_manage_staff',
    filtro: 'staff',
    nombre: 'Personal',
    ayuda: 'Da y quita permisos, y ve lo que hace el personal.',
    icono: UserCogIcon,
  },
]

/** Espejo de las capacidades del servidor: aquí deciden qué se muestra;
 *  qué se permite lo decide el servidor en cada petición. */
export function esPersonal(cuenta: Cuenta): boolean {
  return PERMISOS.some((permiso) => Boolean(cuenta?.[permiso.clave]))
}

export function atiende(cuenta: Cuenta): boolean {
  return Boolean(cuenta?.can_attend_customers)
}

export function llevaFinanzas(cuenta: Cuenta): boolean {
  return Boolean(cuenta?.can_manage_finances)
}

export function llevaPersonal(cuenta: Cuenta): boolean {
  return Boolean(cuenta?.can_manage_staff)
}

/** Con permisos y sin dos pasos: el panel no abre hasta activarlos. */
export function faltanDosPasos(cuenta: Cuenta): boolean {
  return esPersonal(cuenta) && !cuenta?.two_factor_enabled
}

/** «Atención y Finanzas», como en la actividad del servidor. */
export function describirPermisos(
  cuenta: Pick<CurrentUser, StaffCapability> | null | undefined,
): string {
  const nombres = PERMISOS.filter((permiso) => cuenta?.[permiso.clave]).map(
    (permiso) => permiso.nombre,
  )
  const [primero, ...resto] = nombres
  if (primero === undefined) return 'Sin permisos'
  if (resto.length === 0) return primero

  return `${nombres.slice(0, -1).join(', ')} y ${resto.at(-1)}`
}

/** Primera sección del panel. `null` es el resumen, solo de finanzas. */
export function primeraSeccion(cuenta: Cuenta): SeccionDePlataforma | null {
  if (llevaFinanzas(cuenta)) return null
  if (atiende(cuenta)) return 'organizations'
  if (llevaPersonal(cuenta)) return 'staff'
  return null
}
