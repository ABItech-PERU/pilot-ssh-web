export const RUTA_DE_CREDITOS = '/app/credits'

export type PestanaDeCreditos = 'transactions' | 'usage' | 'topups'

/** Única fuente de las rutas de créditos y sus pestañas. */
export function buildCreditsPath(pestana?: PestanaDeCreditos): string {
  return pestana ? `${RUTA_DE_CREDITOS}/${pestana}` : RUTA_DE_CREDITOS
}
