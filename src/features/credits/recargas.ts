import { nombreDelMetodo } from '@/features/credits/metodos'
import type { ApiError } from '@/lib/api-error'
import type { TopUpRequest, TopUpRequestDetail, TopUpStatus } from '@/types/api'

/** Los del modelo más «con parte devuelta», que el servidor filtra como
 *  estado aunque sea una acreditada. */
export const ESTADOS_DE_RECARGA: {
  valor: TopUpStatus | 'partially_refunded'
  etiqueta: string
}[] = [
  { valor: 'pending', etiqueta: 'Pendientes' },
  { valor: 'completed', etiqueta: 'Acreditadas' },
  { valor: 'partially_refunded', etiqueta: 'Devueltas en parte' },
  { valor: 'refunded', etiqueta: 'Devueltas' },
  { valor: 'disputed', etiqueta: 'En disputa' },
  { valor: 'charged_back', etiqueta: 'Contracargos' },
  { valor: 'cancelled', etiqueta: 'Canceladas' },
]

/** Más fino que `status`: sin pagar, en agente o esperando al proveedor
 *  piden cosas distintas. */
export type PuntoDeRecarga =
  | 'sin-pagar'
  | 'solicitada'
  | 'en-agente'
  | 'en-confirmacion'
  | 'acreditada'
  | 'devuelta-en-parte'
  | 'cancelada'
  | 'devuelta'
  | 'en-disputa'
  | 'contracargo'

/** `aviso`: pide algo. `proceso`: esperar. `info`: dinero devuelto.
 *  `peligro`: dinero perdido. Gris solo para lo cancelado. */
export type TonoDeRecarga = 'aviso' | 'proceso' | 'ok' | 'neutro' | 'info' | 'peligro'

export type AccionDeRecarga = 'pagar' | 'codigo' | 'contacto' | null

export interface EstadoDeRecarga {
  punto: PuntoDeRecarga
  etiqueta: string
  tono: TonoDeRecarga
  accion: AccionDeRecarga
}

export function describirRecarga(
  solicitud: Pick<
    TopUpRequest,
    'status' | 'external_id' | 'voucher_url' | 'refunded_credits'
  >,
  enLinea = true,
): EstadoDeRecarga {
  switch (solicitud.status) {
    case 'completed':
      // Sigue acreditada; la etiqueta nombra la devolución
      return Number(solicitud.refunded_credits) > 0
        ? {
            punto: 'devuelta-en-parte',
            etiqueta: 'Devuelta en parte',
            tono: 'aviso',
            accion: null,
          }
        : { punto: 'acreditada', etiqueta: 'Acreditada', tono: 'ok', accion: null }
    case 'cancelled':
      return { punto: 'cancelada', etiqueta: 'Cancelada', tono: 'neutro', accion: null }
    case 'refunded':
      return { punto: 'devuelta', etiqueta: 'Devuelta', tono: 'info', accion: null }
    case 'disputed':
      return { punto: 'en-disputa', etiqueta: 'En disputa', tono: 'aviso', accion: null }
    case 'charged_back':
      return {
        punto: 'contracargo',
        etiqueta: 'Contracargo',
        tono: 'peligro',
        accion: null,
      }
  }
  if (solicitud.voucher_url) {
    return {
      punto: 'en-agente',
      etiqueta: 'Pagar en agente',
      tono: 'aviso',
      accion: 'codigo',
    }
  }
  // Pagada sin acreditar: Yape y efectivo tardan; la cierra el aviso del
  // proveedor
  if (solicitud.external_id) {
    return {
      punto: 'en-confirmacion',
      etiqueta: 'En confirmación',
      tono: 'proceso',
      accion: null,
    }
  }
  // Sin pasarela, quien pidió ya hizo su parte: falta que finanzas cobre
  if (!enLinea) {
    return {
      punto: 'solicitada',
      etiqueta: 'Solicitada',
      tono: 'proceso',
      accion: 'contacto',
    }
  }
  return { punto: 'sin-pagar', etiqueta: 'Sin pagar', tono: 'aviso', accion: 'pagar' }
}

const QUE_SIGNIFICA: Record<PuntoDeRecarga, string> = {
  'sin-pagar': 'Pedida y sin pagar. Termine el pago para que entren los créditos.',
  solicitada: 'Pedida y a la espera. Nos comunicaremos con usted para completar el pago.',
  'en-agente':
    'Con código de pago. Páguelo en un agente y los créditos entran hasta seis horas después.',
  'en-confirmacion':
    'Pago recibido. Los créditos entran en cuanto el proveedor lo confirme.',
  acreditada: 'Los créditos ya están en el saldo.',
  'devuelta-en-parte':
    'Se devolvió parte del pago y se descontaron los créditos que le tocaban. El resto sigue en el saldo.',
  cancelada: 'Sustituida por otra recarga, o cancelada sin pagar.',
  devuelta: 'El proveedor devolvió el pago y los créditos se descontaron del saldo.',
  'en-disputa':
    'Quien pagó abrió un contracargo. El proveedor retiene el dinero mientras lo revisa; los créditos siguen hasta que se resuelva.',
  contracargo:
    'El contracargo se perdió: el pago se debitó y los créditos se descontaron del saldo.',
}

export function explicarPunto(punto: PuntoDeRecarga): string {
  return QUE_SIGNIFICA[punto]
}

/** Una persona o el proveedor. Sin ninguno, la recarga es anterior a que
 *  se guardara el autor. */
function quienAcredito(recarga: TopUpRequestDetail): string | undefined {
  if (recarga.completed_by) return `Por ${recarga.completed_by}`
  return recarga.external_id ? 'Por el proveedor del pago' : undefined
}

export interface PasoDelHistorial {
  cuando: string
  titulo: string
  detalle?: string
  /** Autor, en su propia línea. */
  quien?: string
}

/** Pasos de la recarga por fecha: pedida, acreditada, disputa,
 *  devoluciones y cancelación. */
export function construirHistorial(
  recarga: TopUpRequestDetail,
  escribir: {
    fechaHora: (iso: string) => string
    creditos: (cantidad: string) => string
    precio: (cantidad: string, moneda: string) => string
  },
): PasoDelHistorial[] {
  const pasos: { en: string; titulo: string; detalle?: string; quien?: string }[] = [
    {
      en: recarga.created_at,
      titulo: 'Pedida',
      quien: recarga.requested_by ? `Por ${recarga.requested_by}` : undefined,
    },
  ]
  if (recarga.completed_at) {
    const cobro = recarga.manual_reference
      ? `${escribir.creditos(recarga.credits)} créditos, cobrada por fuera${
          recarga.payment_method ? ` (${nombreDelMetodo(recarga.payment_method)})` : ''
        } con la operación ${recarga.manual_reference}`
      : `${escribir.creditos(recarga.credits)} créditos entraron al saldo`
    pasos.push({
      en: recarga.completed_at,
      titulo: 'Acreditada',
      detalle: cobro,
      quien: quienAcredito(recarga),
    })
  }
  if (recarga.disputed_at) {
    pasos.push({
      en: recarga.disputed_at,
      titulo: 'Contracargo abierto',
      detalle: 'El proveedor retiene el dinero mientras lo revisa',
    })
  }
  for (const devolucion of recarga.refunds) {
    pasos.push({
      en: devolucion.at,
      titulo:
        recarga.charged_back_at === devolucion.at ? 'Contracargo perdido' : 'Devolución',
      detalle: `${escribir.creditos(devolucion.credits)} créditos descontados`,
    })
  }
  if (recarga.status === 'refunded' && recarga.refunded_at) {
    pasos.push({
      en: recarga.refunded_at,
      titulo: 'Devuelta por completo',
      detalle: `${escribir.precio(recarga.refunded_amount, recarga.price_currency)} de vuelta`,
    })
  }
  if (recarga.cancelled_at) {
    pasos.push({
      en: recarga.cancelled_at,
      titulo: 'Cancelada',
      detalle: recarga.cancelled_by ? undefined : 'El pago no llegó a completarse',
      quien: recarga.cancelled_by ? `Por ${recarga.cancelled_by}` : undefined,
    })
  }

  return pasos
    .sort((a, b) => a.en.localeCompare(b.en))
    .map(({ en, titulo, detalle, quien }) => ({
      cuando: escribir.fechaHora(en),
      titulo,
      detalle,
      quien,
    }))
}

/** Qué es y qué falta, en una línea. */
export function explicarPendiente(
  punto: PuntoDeRecarga,
  importe: string,
  cuando: string,
  enLinea = true,
): { titulo: string; detalle: string } {
  // Sin pasarela no hay pago que terminar: espera a finanzas
  if (!enLinea && punto !== 'en-agente' && punto !== 'en-confirmacion') {
    return {
      titulo: `Recarga de ${importe} solicitada`,
      detalle: `Pedida ${cuando}. Nos comunicaremos con usted para completar el pago.`,
    }
  }

  switch (punto) {
    case 'en-agente':
      return {
        titulo: `Recarga de ${importe} por pagar en un agente`,
        detalle: `Pedida ${cuando}. Los créditos entran hasta seis horas después de pagar.`,
      }
    case 'en-confirmacion':
      return {
        titulo: `Pago de ${importe} recibido ${cuando}`,
        detalle: 'Los créditos entran en cuanto el proveedor lo confirme.',
      }
    default:
      return {
        titulo: `Recarga de ${importe} sin pagar`,
        detalle: `Pedida ${cuando}. Termine el pago para que entren los créditos.`,
      }
  }
}

/** El límite de intentos dura hasta una hora: se dice cuánto esperar. */
export function describirFalloDelPago(fallo: ApiError): string {
  if (fallo.code !== 'demasiadas_peticiones') return fallo.message
  if (!fallo.retryAfter) return 'Demasiados intentos de pago. Inténtelo más tarde.'
  const minutos = Math.ceil(fallo.retryAfter / 60)
  return `Demasiados intentos de pago. Vuelva a intentarlo en ${minutos} min.`
}
