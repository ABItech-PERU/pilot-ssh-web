import type { QueryClient } from '@tanstack/react-query'

import { clavesDelSitio } from '@/features/sitio/api'
import type { PublicPricing, SiteInfo } from '@/types/api'

export const ID_DE_LOS_DATOS = 'datos-del-sitio'

export interface DatosDelSitio {
  sitio: SiteInfo
  precios: PublicPricing
}

/** Siembra lo que la compilación dejó en la página. Viejo a propósito
 *  (`updatedAt: 0`): se pinta al instante y se vuelve a pedir. */
export function seedSiteData(cliente: QueryClient) {
  const nodo = document.getElementById(ID_DE_LOS_DATOS)
  if (!nodo?.textContent) return

  const { sitio, precios } = JSON.parse(nodo.textContent) as DatosDelSitio
  cliente.setQueryData(clavesDelSitio.sitio, sitio, { updatedAt: 0 })
  cliente.setQueryData(clavesDelSitio.precios, precios, { updatedAt: 0 })
}
