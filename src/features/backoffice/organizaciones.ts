import type { TonoDeRecarga } from '@/features/credits/recargas'
import type { Tono } from '@/features/credits/saldo'
import type { OrganizationStatus } from '@/types/api'

export const ESTADOS_DE_ORGANIZACION: { valor: OrganizationStatus; etiqueta: string }[] =
  [
    { valor: 'active', etiqueta: 'Activas' },
    { valor: 'suspended', etiqueta: 'Suspendidas' },
  ]

/** Estado en una palabra, con el color de la insignia. */
export function describirEstadoDeOrganizacion(estado: OrganizationStatus): {
  etiqueta: string
  tono: TonoDeRecarga
} {
  return estado === 'active'
    ? { etiqueta: 'Activa', tono: 'ok' }
    : { etiqueta: 'Suspendida', tono: 'peligro' }
}

/** Tono de texto a tono de insignia. El normal va en verde: en la
 *  plataforma, «con saldo» es lo bueno. */
export function tonoDeInsignia(tono: Tono): TonoDeRecarga {
  return tono === 'normal' ? 'ok' : tono
}
