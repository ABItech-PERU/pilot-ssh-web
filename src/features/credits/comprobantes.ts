import type { QueryKey } from '@tanstack/react-query'

import type { ReceiptFormat } from '@/types/api'

/** Sin enlace público: lleva nombre, banco y cuenta del cliente. Se pide
 *  a la API con la sesión, por la ruta del cliente o la de la plataforma. */
export interface Comprobante {
  formato: ReceiptFormat
  clave: QueryKey
  cargar: () => Promise<Blob>
}

export type TipoDeComprobante = 'imagen' | 'pdf'

export function tipoDeComprobante(formato: ReceiptFormat): TipoDeComprobante {
  return formato === 'pdf' ? 'pdf' : 'imagen'
}

/** «Comprobante Recarga S/ 50 BCP-778812.pdf», no el id del servidor. */
export function nombreDelComprobante(
  formato: ReceiptFormat,
  partes: { paquete: string; operacion: string },
): string {
  const limpio = [partes.paquete, partes.operacion]
    .filter(Boolean)
    .join(' ')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return `Comprobante${limpio ? ` ${limpio}` : ''}.${formato}`
}
