import type { MethodShare } from '@/types/api'

export interface MedioConParte extends MethodShare {
  /** Parte del dinero cobrado por este medio, de 0 a 1. */
  parte: number
}

/** Parte del dinero, no del número de recargas: diez de S/ 20 pesan menos
 *  que dos de S/ 100. */
export function repartir(medios: MethodShare[]): MedioConParte[] {
  const total = medios.reduce((suma, medio) => suma + Number(medio.amount), 0)
  return medios.map((medio) => ({
    ...medio,
    parte: total > 0 ? Number(medio.amount) / total : 0,
  }))
}
