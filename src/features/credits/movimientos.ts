import type { CreditKind, CreditTransaction } from '@/types/api'

/** Orden del selector: primero lo que entra, luego lo que sale. */
export const TIPOS_DE_MOVIMIENTO: { valor: CreditKind; etiqueta: string }[] = [
  { valor: 'topup', etiqueta: 'Recargas' },
  { valor: 'bonus', etiqueta: 'Bonos' },
  { valor: 'grant', etiqueta: 'Asignaciones' },
  { valor: 'referral', etiqueta: 'Referidos' },
  { valor: 'refund', etiqueta: 'Devoluciones' },
  { valor: 'consumption', etiqueta: 'Uso diario' },
  { valor: 'adjustment', etiqueta: 'Ajustes' },
]

/** Una palabra para la insignia: el rótulo del servidor no cabe. */
export const NOMBRE_DEL_TIPO: Record<CreditKind, string> = {
  topup: 'Recarga',
  bonus: 'Bono',
  grant: 'Asignación',
  referral: 'Referido',
  refund: 'Devolución',
  consumption: 'Uso diario',
  adjustment: 'Ajuste',
}

/** Entra, se gasta, lo devuelve el proveedor o se corrige a mano. Cada
 *  lado con su color: una devolución no parece un día de uso. */
export type LadoDelMovimiento = 'entra' | 'sale' | 'devuelve' | 'corrige'

export function ladoDe(
  movimiento: Pick<CreditTransaction, 'kind' | 'amount'>,
): LadoDelMovimiento {
  if (movimiento.kind === 'adjustment') return 'corrige'
  if (movimiento.kind === 'refund') return 'devuelve'
  return Number(movimiento.amount) >= 0 ? 'entra' : 'sale'
}

/** Solo si lo hizo una persona: uso diario y recargas los registra el
 *  sistema. */
export function autorDe(
  movimiento: Pick<CreditTransaction, 'kind' | 'actor'>,
): string | null {
  const manual: CreditKind[] = ['grant', 'adjustment', 'refund']
  return manual.includes(movimiento.kind) && movimiento.actor ? movimiento.actor : null
}

/** Saldo final menos lo movido. Se calcula aquí: el libro guarda un solo
 *  saldo por fila. */
export function saldoAntes(
  movimiento: Pick<CreditTransaction, 'amount' | 'balance_after'>,
): number {
  return Number(movimiento.balance_after) - Number(movimiento.amount)
}

export function conceptoDe(
  movimiento: Pick<CreditTransaction, 'description' | 'kind_label'>,
): string {
  return movimiento.description || movimiento.kind_label
}
