import { useOutletContext } from 'react-router'

import { AccessDiagnosis } from '@/features/access/AccessDiagnosis'
import { ServerAccess } from '@/features/access/ServerAccess'
import { useCurrentOrganization } from '@/features/organizations/current'
import type { Server } from '@/types/api'

/** Lee y corrige lo ya concedido. Dar acceso nuevo es solo de «Compartir»,
 *  en la cabecera: un formulario, no dos. */
export function ServerAccessTab() {
  const server = useOutletContext<Server>()
  const { organization } = useCurrentOrganization()
  const puedeRepartir = organization?.role === 'owner' || organization?.role === 'admin'

  return (
    <div className="max-w-3xl space-y-8">
      {/* Diagnóstico solo para quien reparte: es quien puede arreglarlo */}
      {puedeRepartir && <AccessDiagnosis server={server} />}
      <ServerAccess server={server} puedeRepartir={puedeRepartir} conFormulario={false} />
    </div>
  )
}
