import { formatPrice } from '@/lib/format'
import type { PricedResource, PublicPricing } from '@/types/api'

export interface Tarifa {
  creditos: number
  /** Soles por día de uso. */
  soles: number
  gratis: number
}

export function describirTarifa(precios: PublicPricing, recurso: PricedResource): Tarifa {
  const regla = precios.rules.find((cada) => cada.resource === recurso)
  const creditos = Number(regla?.credits_per_day ?? 0)
  return {
    creditos,
    soles: creditos * Number(precios.credit_price),
    gratis: regla?.free_allowance ?? 0,
  }
}

export function formatSoles(soles: number): string {
  return formatPrice(soles.toFixed(2), 'PEN')
}

export interface Uso {
  personas: number
  servidores: number
  dias: number
}

/** Créditos que cuesta un día de ese uso, descontado lo gratuito. */
function creditosPorDia(precios: PublicPricing, uso: Uso): number {
  const persona = describirTarifa(precios, 'member')
  const servidor = describirTarifa(precios, 'server')
  return (
    Math.max(0, uso.personas - persona.gratis) * persona.creditos +
    Math.max(0, uso.servidores - servidor.gratis) * servidor.creditos
  )
}

export function estimarCostoMensual(precios: PublicPricing, uso: Uso): number {
  const diario = creditosPorDia(precios, uso) * Number(precios.credit_price)
  return Math.round(diario * uso.dias * 100) / 100
}

/** Traduce el regalo a días de trabajo de un equipo real. */
export const EQUIPO_TIPICO: Uso = { personas: 3, servidores: 4, dias: 22 }

export function diasQueCubre(precios: PublicPricing, creditos: string, uso: Uso): number {
  const diario = creditosPorDia(precios, uso)
  return diario === 0 ? Infinity : Math.floor(Number(creditos) / diario)
}

/** «1 persona», «2 servidores». */
export function contar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}
