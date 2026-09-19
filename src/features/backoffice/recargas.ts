import { describirMetodo } from '@/features/credits/metodos'
import type { PlatformTopUp, TopUpRequest } from '@/types/api'

/** Filtro por cobro, el eje de finanzas. Valores del servidor. */
export const COBROS = [
  { valor: 'gateway', etiqueta: 'Por pasarela' },
  { valor: 'manual', etiqueta: 'Cobradas por fuera' },
  { valor: 'offline', etiqueta: 'Por cobrar por fuera' },
  { valor: 'unpaid', etiqueta: 'Sin pagar' },
]

const NOMBRE_DE_PASARELA: Record<string, string> = { mercadopago: 'Mercado Pago' }

/** `pasarela`: pagada en línea. `por-fuera`: acreditada a mano.
 *  `por-cobrar`: pedida sin pasarela; la cobra finanzas.
 *  `sin-cobrar`: cancelada sin cobro.
 *  `sin-pagar`: pago en línea sin terminar; nada que acreditar. */
export type MedioDeCobro =
  'pasarela' | 'por-fuera' | 'por-cobrar' | 'sin-cobrar' | 'sin-pagar'

export interface Cobro {
  medio: MedioDeCobro
  etiqueta: string
  /** Con qué se pagó o qué falta. Sin la operación: va en su columna. */
  detalle: string | null
}

type Recarga = Pick<
  PlatformTopUp,
  'status' | 'external_id' | 'gateway' | 'payment_method' | 'payment_brand'
>

/** Lo decide la referencia del pago, no el proveedor: abrir el formulario
 *  sin pagar deja `gateway` puesto sin cobro. */
export function describirCobro(solicitud: Recarga): Cobro {
  if (solicitud.external_id) {
    return {
      medio: 'pasarela',
      etiqueta: nombreDe(solicitud.gateway),
      detalle: describirMetodo(solicitud),
    }
  }
  if (solicitud.status === 'completed') {
    return {
      medio: 'por-fuera',
      etiqueta: 'Por fuera',
      detalle: describirMetodo(solicitud),
    }
  }
  if (solicitud.gateway) {
    return {
      medio: 'sin-pagar',
      etiqueta: nombreDe(solicitud.gateway),
      detalle: 'Pago sin terminar',
    }
  }
  // Cancelada: no espera nada de nadie
  if (solicitud.status !== 'pending') {
    return { medio: 'sin-cobrar', etiqueta: 'Por fuera', detalle: 'Sin cobrar' }
  }
  return { medio: 'por-cobrar', etiqueta: 'Por fuera', detalle: 'Pendiente de cobro' }
}

function nombreDe(gateway: string): string {
  return NOMBRE_DE_PASARELA[gateway] ?? (gateway || 'Pasarela')
}

/** Solo lo pendiente sin pago en línea. Lo pagado lo cierra el aviso del
 *  proveedor; acreditarlo a mano sumaría dos veces. */
export function seResuelveAMano(
  solicitud: Pick<TopUpRequest, 'status' | 'external_id'>,
): boolean {
  return solicitud.status === 'pending' && solicitud.external_id === ''
}

/** Pedida sin pasarela: finanzas la cobra y la acredita. La separa de la
 *  abandonada en línea, que no tiene nada que acreditar. */
export function esperaCobroPorFuera(
  solicitud: Pick<TopUpRequest, 'status' | 'external_id'> & { gateway: string },
): boolean {
  return seResuelveAMano(solicitud) && solicitud.gateway === ''
}
