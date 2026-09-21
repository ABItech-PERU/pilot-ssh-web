import type { CurrentUser } from '@/types/api'

export type EstadoDosPasos = 'desactivada' | 'correo' | 'app'

export function describirDosPasos(
  cuenta: Pick<CurrentUser, 'two_factor_enabled' | 'two_factor_method'>,
): EstadoDosPasos {
  if (!cuenta.two_factor_enabled) return 'desactivada'
  return cuenta.two_factor_method === 'app' ? 'app' : 'correo'
}

/** «JBSW Y3DP EHPK»: de cuatro en cuatro se copia a mano sin perderse. */
export function agruparClave(clave: string): string {
  return clave.replace(/(.{4})(?=.)/g, '$1 ')
}

/** Con tres o menos se avisa: el siguiente teléfono perdido deja fuera. */
export function quedanPocosRespaldos(quedan: number | null): boolean {
  return quedan !== null && quedan <= 3
}

/** Archivo que se guarda: de qué cuenta son y cómo se usan. */
export function textoDeRespaldo(codigos: string[], correo: string, fecha: Date): string {
  return [
    'Pilot SSH · Códigos de respaldo',
    `Cuenta: ${correo}`,
    `Generados: ${fecha.toISOString().slice(0, 10)}`,
    '',
    'Cada código sirve una sola vez para entrar sin la app autenticadora.',
    '',
    ...codigos.map((codigo, indice) => `${String(indice + 1).padStart(2)}. ${codigo}`),
    '',
  ].join('\n')
}
