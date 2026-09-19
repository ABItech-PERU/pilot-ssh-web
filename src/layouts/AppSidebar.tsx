import {
  Building2Icon,
  CoinsIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  ServerIcon,
  UsersIcon,
} from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import { RecentCredentials } from '@/features/credentials/RecentCredentials'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import { OrganizationSwitcher } from '@/features/organizations/OrganizationSwitcher'
import {
  Barra,
  CabeceraDeBarra,
  Entrada,
  PieDeBarra,
  type PropsDeBarra,
} from '@/layouts/sidebar-parts'

interface Seccion {
  to: string
  label: string
  icon: React.ElementType
  /** Se oculta lo que el servidor le negaría. */
  soloQuienAdministra?: boolean
}

const NAVEGACION: Seccion[] = [
  { to: '/app/servers', label: 'Servidores', icon: ServerIcon },
  { to: '/app/credentials', label: 'Credenciales', icon: KeyRoundIcon },
  { to: '/app/organization', label: 'Organización', icon: Building2Icon },
  { to: '/app/team', label: 'Equipo', icon: UsersIcon },
  { to: '/app/credits', label: 'Créditos', icon: CoinsIcon },
  {
    to: '/app/audit',
    label: 'Auditoría',
    icon: ScrollTextIcon,
    soloQuienAdministra: true,
  },
]

export function AppSidebar({ colapsada = false, onAlternar, className }: PropsDeBarra) {
  const { organization } = useCurrentOrganization()
  const secciones = NAVEGACION.filter(
    (seccion) => !seccion.soloQuienAdministra || canManage(organization),
  )

  return (
    <Barra colapsada={colapsada} onAlternar={onAlternar} className={className}>
      <CabeceraDeBarra colapsada={colapsada} onAlternar={onAlternar} />

      <OrganizationSwitcher compacta={colapsada} />
      <Separator className="my-2" />

      <nav className="flex flex-col gap-0.5">
        {secciones.map(({ to, label, icon: Icono }) => (
          <Entrada key={to} to={to} label={label} icono={Icono} colapsada={colapsada} />
        ))}
      </nav>

      {!colapsada && <RecentCredentials />}

      <PieDeBarra colapsada={colapsada} className="mt-auto" />
    </Barra>
  )
}
