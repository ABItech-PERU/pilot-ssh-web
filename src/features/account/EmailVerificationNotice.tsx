import { MailIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { EmailVerificationDialog } from '@/features/account/EmailVerificationDialog'
import { RegaloAlConfirmar } from '@/features/account/RegaloAlConfirmar'
import { useSession } from '@/features/auth/session'

/** Sobre cada pantalla mientras el correo no esté confirmado: sin él no
 *  llegan el regalo ni lo gratuito de cada día. */
export function EmailVerificationNotice() {
  const { user } = useSession()
  const [confirmando, setConfirmando] = useState(false)

  if (!user || user.has_verified_email) return null

  return (
    <div
      role="status"
      className="border-primary/30 bg-primary/5 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-3"
    >
      <MailIcon className="text-primary size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-sm">
        Confirme su correo y reciba <RegaloAlConfirmar />.
      </p>
      <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
        Confirmar correo
      </Button>
      <EmailVerificationDialog
        email={user.email}
        open={confirmando}
        onOpenChange={setConfirmando}
      />
    </div>
  )
}
