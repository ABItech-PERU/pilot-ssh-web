import {
  HistoryIcon,
  KeyRoundIcon,
  LaptopIcon,
  LockKeyholeIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserXIcon,
} from 'lucide-react'

import type { FiltrosDeActividad } from '@/features/auth/api'
import { CLAVE_USUARIO } from '@/features/auth/session'
import type { AuditEntry } from '@/types/api'

/** Cuelga de la identidad: al invalidarla (correo, dos pasos) se refresca
 *  también la actividad. */
export const clavesActividad = {
  pagina: (pagina: number, porPagina: number, filtros: FiltrosDeActividad = {}) =>
    [...CLAVE_USUARIO, 'actividad', pagina, porPagina, filtros] as const,
}

const ICONOS: Record<string, React.ElementType> = {
  'account.signed_in': LogInIcon,
  'account.signed_out': LogOutIcon,
  'account.registered': UserPlusIcon,
  'account.password_changed': LockKeyholeIcon,
  'account.sessions_revoked': LaptopIcon,
  'account.two_factor_enabled': ShieldCheckIcon,
  'account.two_factor_disabled': ShieldCheckIcon,
  'account.email_changed': MailIcon,
  'account.email_verified': MailIcon,
  // Acciones del personal sobre la cuenta; muestran quién las hizo
  'account.verification_resent': MailIcon,
  'account.password_reset_sent': KeyRoundIcon,
  'account.two_factor_reset': ShieldOffIcon,
  'account.deactivated': UserXIcon,
  'account.reactivated': UserCheckIcon,
}

export function iconoDeActividad(accion: string): React.ElementType {
  return ICONOS[accion] ?? HistoryIcon
}

/** Equipo nunca visto: posible acceso ajeno. Va en ámbar y con texto: el
 *  color solo no basta. */
export function esEquipoNuevo(entrada: Pick<AuditEntry, 'metadata'>): boolean {
  return entrada.metadata.new_device === true
}

export function DetalleDeActividad({ entrada }: { entrada: AuditEntry }) {
  if (!entrada.detail) return null
  return (
    <span className={esEquipoNuevo(entrada) ? 'text-warning font-medium' : undefined}>
      {entrada.detail}
    </span>
  )
}

export type EstadoDeSesion = 'actual' | 'abierta' | 'cerrada'

/** Solo aplica a inicios de sesión: uno no reconocido y aún abierto es lo
 *  primero que cerrar. */
export function estadoDeSesion(
  entrada: Pick<AuditEntry, 'action' | 'target_id'>,
  abiertas: ReadonlySet<string>,
  actual: string | null,
): EstadoDeSesion | null {
  if (entrada.action !== 'account.signed_in') return null
  if (entrada.target_id === actual) return 'actual'
  return abiertas.has(entrada.target_id) ? 'abierta' : 'cerrada'
}
