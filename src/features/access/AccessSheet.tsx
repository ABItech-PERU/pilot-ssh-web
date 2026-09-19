import { UserPlusIcon } from 'lucide-react'
import { useState } from 'react'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ServerAccess } from '@/features/access/ServerAccess'
import { InviteDialog } from '@/features/members/InviteDialog'
import type { Server } from '@/types/api'

interface Props {
  server: Server | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Solo quien administra la organización reparte accesos. */
  puedeRepartir: boolean
}

/** Vista rápida desde el inventario; mismo contenido que la pestaña Accesos. */
export function AccessSheet({ server, open, onOpenChange, puedeRepartir }: Props) {
  // «A quien» lista solo el equipo; a los demas se les invita desde aqui
  const [invitando, setInvitando] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent className="sm:max-w-lg">
        <SidePanelHeader>
          <SheetTitle className="text-lg">
            {server
              ? puedeRepartir
                ? `Compartir ${server.name}`
                : `Accesos de ${server.name}`
              : 'Accesos'}
          </SheetTitle>
          <SheetDescription>
            Quién entra a este servidor y con qué nivel.
          </SheetDescription>
        </SidePanelHeader>

        <SidePanelBody className="p-5">
          {server && (
            <ServerAccess server={server} puedeRepartir={puedeRepartir} activo={open} />
          )}
        </SidePanelBody>
        <SidePanelFooter>
          {puedeRepartir && (
            <Button className="flex-1" onClick={() => setInvitando(true)}>
              <UserPlusIcon />
              Invitar a alguien
            </Button>
          )}
        </SidePanelFooter>
      </SidePanelContent>
      {server && (
        <InviteDialog
          slug={server.organization_slug}
          open={invitando}
          onOpenChange={setInvitando}
        />
      )}
    </Sheet>
  )
}
