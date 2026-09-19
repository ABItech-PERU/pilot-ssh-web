import { useQuery } from '@tanstack/react-query'

import { clavesDelSitio, fetchPublicPricing, fetchSiteInfo } from '@/features/sitio/api'

const CINCO_MINUTOS = 5 * 60_000

export function useSitio() {
  return useQuery({
    queryKey: clavesDelSitio.sitio,
    queryFn: fetchSiteInfo,
    staleTime: CINCO_MINUTOS,
  })
}

export function usePrecios() {
  return useQuery({
    queryKey: clavesDelSitio.precios,
    queryFn: fetchPublicPricing,
    staleTime: CINCO_MINUTOS,
  })
}
