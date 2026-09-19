import { useQuery } from '@tanstack/react-query'

import * as creditsApi from '@/features/credits/api'

/** Cambia con el cobro nocturno o al recargar; página, aviso y diálogos
 *  comparten la consulta. */
const SALDO_VIGENTE_MS = 5 * 60_000
/** Las fija Pilot SSH; casi nunca cambian. */
const TARIFAS_VIGENTES_MS = 60 * 60_000

export function useSaldo(slug: string | null) {
  return useQuery({
    queryKey: creditsApi.clavesCreditos.saldo(slug),
    queryFn: () => creditsApi.fetchWallet(slug!),
    enabled: Boolean(slug),
    staleTime: SALDO_VIGENTE_MS,
  })
}

export function useTarifas() {
  return useQuery({
    queryKey: creditsApi.clavesCreditos.tarifas(),
    queryFn: creditsApi.fetchPricing,
    staleTime: TARIFAS_VIGENTES_MS,
  })
}

export function usePaquetes() {
  return useQuery({
    queryKey: creditsApi.clavesCreditos.paquetes(),
    queryFn: creditsApi.fetchPackages,
    staleTime: TARIFAS_VIGENTES_MS,
  })
}
