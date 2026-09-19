import { EmailVerificationNotice } from '@/features/account/EmailVerificationNotice'
import { TimeZoneNotice } from '@/features/account/TimeZoneNotice'
import { BalanceNotice } from '@/features/credits/BalanceNotice'
import { AppSidebar } from '@/layouts/AppSidebar'
import { Shell } from '@/layouts/Shell'

/** Panel del cliente: su organización, servidores y equipo. */
export function AppLayout() {
  return (
    <Shell
      barra={(props) => <AppSidebar {...props} />}
      descripcionDelMenu="Secciones de tu organización."
      avisos={
        <>
          <TimeZoneNotice />
          <EmailVerificationNotice />
          <BalanceNotice />
        </>
      }
    />
  )
}
