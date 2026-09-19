import { http } from '@/lib/http'
import type { PublicPricing, SiteInfo } from '@/types/api'

export const clavesDelSitio = {
  sitio: ['sitio'] as const,
  precios: ['sitio', 'precios'] as const,
}

export async function fetchSiteInfo() {
  const { data } = await http.get<SiteInfo>('/site')
  return data
}

export async function fetchPublicPricing() {
  const { data } = await http.get<PublicPricing>('/pricing')
  return data
}
