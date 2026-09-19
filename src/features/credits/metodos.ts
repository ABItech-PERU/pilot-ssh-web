import type { PaymentMethod, TopUpRequest } from '@/types/api'

/** Espejo del catálogo del servidor, con rótulos propios (los suyos van
 *  sin tilde). Orden del selector: pasarela primero, luego por fuera. */
export const METODOS: { valor: PaymentMethod; etiqueta: string }[] = [
  { valor: 'credit_card', etiqueta: 'Tarjeta de crédito' },
  { valor: 'debit_card', etiqueta: 'Tarjeta de débito' },
  { valor: 'yape', etiqueta: 'Yape' },
  { valor: 'plin', etiqueta: 'Plin' },
  { valor: 'pagoefectivo', etiqueta: 'PagoEfectivo' },
  { valor: 'transfer', etiqueta: 'Transferencia' },
  { valor: 'deposit', etiqueta: 'Depósito' },
  { valor: 'cash', etiqueta: 'Efectivo' },
  { valor: 'other', etiqueta: 'Otro' },
]

/** Los que finanzas elige al cobrar sin pasarela. */
export const METODOS_POR_FUERA: PaymentMethod[] = [
  'transfer',
  'deposit',
  'yape',
  'plin',
  'cash',
  'other',
]

const NOMBRE_DE_MARCA: Record<string, string> = {
  visa: 'Visa',
  debvisa: 'Visa',
  master: 'Mastercard',
  debmaster: 'Mastercard',
  amex: 'American Express',
  diners: 'Diners',
}

export function nombreDelMetodo(metodo: PaymentMethod | ''): string {
  return METODOS.find((cada) => cada.valor === metodo)?.etiqueta ?? 'Sin registrar'
}

/** «Tarjeta de crédito · Visa»: marca solo en tarjetas; en Yape o
 *  PagoEfectivo repite el medio. Null sin medio, en recargas antiguas. */
export function describirMetodo(
  solicitud: Pick<TopUpRequest, 'payment_method' | 'payment_brand'>,
): string | null {
  if (!solicitud.payment_method) return null

  const nombre = nombreDelMetodo(solicitud.payment_method)
  const esTarjeta =
    solicitud.payment_method === 'credit_card' ||
    solicitud.payment_method === 'debit_card'
  if (!esTarjeta || !solicitud.payment_brand) return nombre

  const marca = solicitud.payment_brand.toLowerCase()
  return `${nombre} · ${NOMBRE_DE_MARCA[marca] ?? capitalizar(marca)}`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
