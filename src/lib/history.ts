/** React Router guarda en `history.state.idx` cuantas entradas propias hay
 *  detras. Cero significa que se llego por enlace directo o pestana nueva. */
export function hasInAppHistory(state: unknown): boolean {
  if (typeof state !== 'object' || state === null) return false
  const indice = (state as { idx?: unknown }).idx
  return typeof indice === 'number' && indice > 0
}
