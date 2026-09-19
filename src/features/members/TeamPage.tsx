import { useQuery } from '@tanstack/react-query'
import { UserPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'

import { PageHeader } from '@/components/states'
import { TabNav } from '@/components/tab-nav'
import { Button } from '@/components/ui/button'
import * as accessApi from '@/features/access/api'
import { InviteDialog } from '@/features/members/InviteDialog'
import * as membersApi from '@/features/members/api'
import { useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'

export interface ContextoDelEquipo {
  slug: string | null
  administra: boolean
  onInvitar: () => void
}

/** Equipo: miembros, grupos y etiquetas. Misma pantalla porque se revisan
 *  seguidas; en pestañas porque cada una se mira entera. */
export function TeamPage() {
  const { slug, organization } = useCurrentOrganization()
  const [invitando, setInvitando] = useState(false)

  // Sin filtros: la pestaña cuenta el equipo entero
  const equipo = useQuery({
    queryKey: membersApi.clavesEquipo.miembros(slug),
    queryFn: () => membersApi.fetchMembers(slug!),
    enabled: Boolean(slug),
  })

  // Misma clave que la pestaña de grupos: sin petición de más
  const grupos = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(slug),
    queryFn: () => accessApi.fetchGroups(slug!),
    enabled: Boolean(slug),
  })

  // Misma clave que la pestaña de etiquetas: sin petición de más
  const etiquetas = useQuery({
    queryKey: serversApi.clavesServidor.catalogo(slug),
    queryFn: () => serversApi.fetchLabelCatalog(slug!),
    enabled: Boolean(slug),
  })

  const administra = organization?.role === 'owner' || organization?.role === 'admin'

  const contexto: ContextoDelEquipo = {
    slug,
    administra,
    onInvitar: () => setInvitando(true),
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipo"
        description={
          organization ? `Quién trabaja en ${organization.name} y a qué entra.` : ''
        }
        action={
          administra && (
            <Button onClick={() => setInvitando(true)}>
              <UserPlusIcon />
              Invitar al equipo
            </Button>
          )
        }
      />

      <TabNav
        etiqueta="Secciones del equipo"
        pestanas={[
          {
            to: '/app/team',
            etiqueta: 'Personas',
            cuenta: equipo.data?.length ?? null,
            end: true,
          },
          {
            to: '/app/team/groups',
            etiqueta: 'Grupos de acceso',
            cuenta: grupos.data?.length ?? null,
          },
          {
            to: '/app/team/labels',
            etiqueta: 'Etiquetas',
            cuenta: etiquetas.data?.length ?? null,
          },
        ]}
      />

      <Outlet context={contexto} />

      {slug && <InviteDialog slug={slug} open={invitando} onOpenChange={setInvitando} />}
    </div>
  )
}
