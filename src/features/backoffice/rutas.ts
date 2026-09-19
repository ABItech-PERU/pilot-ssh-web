export const RUTA_DE_PLATAFORMA = '/backoffice'

export type SeccionDePlataforma =
  | 'organizations'
  | 'accounts'
  | 'topups'
  | 'transactions'
  | 'pricing'
  | 'history'
  | 'staff'
  | 'activity'
  | 'operations'

/** Con organización, la sección llega acotada a ella: así se salta de su
 *  ficha a sus recargas o movimientos. */
export function buildPlatformPath(
  seccion?: SeccionDePlataforma,
  organizacion?: string,
): string {
  const ruta = seccion ? `${RUTA_DE_PLATAFORMA}/${seccion}` : RUTA_DE_PLATAFORMA
  return organizacion ? `${ruta}?organization=${encodeURIComponent(organizacion)}` : ruta
}

export type PestanaDeOperaciones = 'payments' | 'emails' | 'tasks'

export function buildOperationsPath(pestana?: PestanaDeOperaciones): string {
  const ruta = buildPlatformPath('operations')
  return pestana ? `${ruta}/${pestana}` : ruta
}

export type PestanaDelCaso = 'team' | 'access' | 'money' | 'notes'

export function buildCasePath(slug: string, pestana?: PestanaDelCaso): string {
  const ruta = `${RUTA_DE_PLATAFORMA}/organizations/${encodeURIComponent(slug)}`
  return pestana ? `${ruta}/${pestana}` : ruta
}
