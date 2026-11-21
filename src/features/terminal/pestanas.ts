/** Varias shells contra el mismo servidor, una por pestaña. */

export interface Pestana {
  id: string
  credentialId: string
}

/** Tope por ventana: más shells a la vez ya no se siguen con la vista. */
export const MAXIMO_DE_PESTANAS = 6

export function buildPestana(credentialId: string): Pestana {
  return { id: crypto.randomUUID(), credentialId }
}

/** Al cerrar la que está delante, el turno pasa a la vecina de la derecha;
 *  si era la última, a la de la izquierda. */
export function fetchActivaTrasCerrar(
  pestanas: Pestana[],
  cerrada: Pestana,
  activa: Pestana,
): Pestana {
  if (cerrada.id !== activa.id) return activa

  const posicion = pestanas.findIndex((una) => una.id === cerrada.id)
  return pestanas[posicion + 1] ?? pestanas[posicion - 1] ?? activa
}

/** Número que distingue shells repetidas de una credencial; 0 cuando es la
 *  única con esa credencial y el nombre basta. */
export function fetchOrdinales(pestanas: Pestana[]): Record<string, number> {
  const totales = new Map<string, number>()
  for (const { credentialId } of pestanas) {
    totales.set(credentialId, (totales.get(credentialId) ?? 0) + 1)
  }

  const contadas = new Map<string, number>()
  const ordinales: Record<string, number> = {}
  for (const { id, credentialId } of pestanas) {
    const orden = (contadas.get(credentialId) ?? 0) + 1
    contadas.set(credentialId, orden)
    ordinales[id] = (totales.get(credentialId) ?? 0) > 1 ? orden : 0
  }
  return ordinales
}
