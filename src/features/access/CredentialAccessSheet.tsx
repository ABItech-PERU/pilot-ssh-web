import { useQuery } from '@tanstack/react-query'
import { UserPlusIcon } from 'lucide-react'
import { useState } from 'react'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ServerAccess } from '@/features/access/ServerAccess'
import { InviteDialog } from '@/features/members/InviteDialog'
import * as serversApi from '@/features/servers/api'
import { isUuid } from '@/lib/ids'
import type { ServerUser } from '@/types/api'

interface Props {
  credencial: ServerUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Solo quien administra la organización reparte accesos. */
  puedeRepartir: boolean
}

/** Quién entra con esta credencial y cómo se comparte. Pide su máquina con
 *  la clave de su página: sirve desde un servidor o desde la lista de
 *  credenciales. */
export function CredentialAccessSheet({
  credencial,
  open,
  onOpenChange,
  puedeRepartir,
}: Props) {
  const servidor = useQuery({
    queryKey: serversApi.clavesServidor.detalle(credencial?.server ?? ''),
    queryFn: () => serversApi.fetchServer(credencial?.server ?? ''),
    enabled: open && isUuid(credencial?.server ?? ''),
  })

  // Como en el del servidor: a quien no esta en el equipo se le invita aqui
  const [invitando, setInvitando] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent className="sm:max-w-lg">
        <SidePanelHeader>
          <SheetTitle className="text-lg">
            {credencial
              ? puedeRepartir
                ? `Compartir ${credencial.username}`
                : `Accesos de ${credencial.username}`
              : 'Accesos'}
          </SheetTitle>
          <SheetDescription>
            Quién entra con esta credencial y con qué nivel.
          </SheetDescription>
        </SidePanelHeader>

        <SidePanelBody className="p-5">
          {servidor.data && credencial ? (
            <ServerAccess
              server={servidor.data}
              credencial={credencial}
              puedeRepartir={puedeRepartir}
              activo={open}
            />
          ) : (
            <Skeleton className="h-72 w-full rounded-lg" />
          )}
        </SidePanelBody>
        <SidePanelFooter>
          {puedeRepartir && servidor.data && (
            <Button className="flex-1" onClick={() => setInvitando(true)}>
              <UserPlusIcon />
              Invitar a alguien
            </Button>
          )}
        </SidePanelFooter>
      </SidePanelContent>
      {servidor.data && (
        <InviteDialog
          slug={servidor.data.organization_slug}
          open={invitando}
          onOpenChange={setInvitando}
        />
      )}
    </Sheet>
  )
}
