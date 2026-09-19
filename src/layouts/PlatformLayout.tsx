import { TimeZoneNotice } from '@/features/account/TimeZoneNotice'
import { PlatformSidebar } from '@/layouts/PlatformSidebar'
import { Shell } from '@/layouts/Shell'

/** Panel del personal: todas las organizaciones. Sin avisos de saldo ni de
 *  correo, propios del cliente; con el de zona horaria. */
export function PlatformLayout() {
  return (
    <Shell
      barra={(props) => <PlatformSidebar {...props} />}
      descripcionDelMenu="Secciones de la plataforma."
      avisos={<TimeZoneNotice />}
    />
  )
}
