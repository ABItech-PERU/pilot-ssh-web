import { ServerIcon, UserIcon, type LucideIcon } from 'lucide-react'

import type { PricedResource, PricingRule } from '@/types/api'

/** Añadir no cuesta; se paga el día que se usa. */
export const RECURSOS: Record<
  PricedResource,
  {
    etiqueta: string
    icono: LucideIcon
    gratis: (cuantos: number) => string
    /** Qué significa lo gratuito, al editar la tarifa. */
    ayudaGratis: string
  }
> = {
  member: {
    etiqueta: 'Cada persona que abre una terminal',
    icono: UserIcon,
    gratis: (cuantos) =>
      cuantos === 1
        ? 'La primera persona de cada día va gratis.'
        : `Las ${cuantos} primeras personas de cada día van gratis.`,
    ayudaGratis: 'No se cobran las primeras personas de cada día. Con 0 se cobran todas.',
  },
  server: {
    etiqueta: 'Cada servidor en el que se abre una terminal',
    icono: ServerIcon,
    gratis: (cuantos) =>
      cuantos === 1
        ? 'El primer servidor de cada día va gratis.'
        : `Los ${cuantos} primeros servidores de cada día van gratis.`,
    ayudaGratis:
      'No se cobran los primeros servidores de cada día. Con 0 se cobran todos.',
  },
}

const UNIDADES: Record<PricedResource, [uno: string, varios: string]> = {
  member: ['persona', 'personas'],
  server: ['servidor', 'servidores'],
}

/** «1 persona y 2 servidores»: lo gratuito diario. Null si no hay. */
export function describirGratuito(tarifas: PricingRule[]): string | null {
  const partes = (['member', 'server'] as const).flatMap((recurso) => {
    const cuantos =
      tarifas.find((tarifa) => tarifa.resource === recurso)?.free_allowance ?? 0
    const [uno, varios] = UNIDADES[recurso]
    return cuantos > 0 ? [`${cuantos} ${cuantos === 1 ? uno : varios}`] : []
  })
  return partes.length > 0 ? partes.join(' y ') : null
}

export function describirGratis(tarifa: PricingRule): string | null {
  return tarifa.free_allowance > 0
    ? RECURSOS[tarifa.resource].gratis(tarifa.free_allowance)
    : null
}
