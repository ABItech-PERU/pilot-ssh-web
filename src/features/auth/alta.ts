export const RUTA_DEL_ALTA = '/onboarding'

/** Con sesión, a dónde desviar; `null` si puede quedarse.
 *
 *  Sin alta terminada no hay panel: el nombre identifica en la auditoría.
 *  Terminada, no se repite. */
export function getDesvioDelAlta(isCompleted: boolean, ruta: string): string | null {
  const isEnAlta = ruta === RUTA_DEL_ALTA

  if (!isCompleted && !isEnAlta) return RUTA_DEL_ALTA
  if (isCompleted && isEnAlta) return '/app/servers'
  return null
}
