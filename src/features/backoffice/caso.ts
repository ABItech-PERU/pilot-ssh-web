import { useOutletContext } from 'react-router'

import type { PlatformOrganizationDetail } from '@/types/api'

/** Organización del caso, vía Outlet: ninguna pestaña la pide ni espera
 *  su carga. */
export function useCaso(): PlatformOrganizationDetail {
  return useOutletContext<PlatformOrganizationDetail>()
}
