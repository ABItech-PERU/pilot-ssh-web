import { cn } from 'cn'
import {
  ActivityIcon,
  ArrowLeftIcon,
  Building2Icon,
  HistoryIcon,
  LayoutDashboardIcon,
  MonitorCogIcon,
  PackageIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TagsIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/session'
import { describirPermisos } from '@/features/backoffice/permisos'
import { buildPlatformPath } from '@/features/backoffice/rutas'
import {
  Barra,
  CabeceraDeBarra,
  Entrada,
  PieDeBarra,
  type PropsDeBarra,
} from '@/layouts/sidebar-parts'
import type { StaffCapability } from '@/types/api'

interface Seccion {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  /** Basta con uno. */
  permisos: StaffCapability[]
}

const FINANZAS: StaffCapability[] = ['can_manage_finances']

const NAVEGACION: Seccion[] = [
  {
    to: buildPlatformPath(),
    label: 'Resumen',
    icon: LayoutDashboardIcon,
    end: true,
    permisos: FINANZAS,
  },
  {
    to: buildPlatformPath('organizations'),
    label: 'Organizaciones',
    icon: Building2Icon,
    permisos: ['can_attend_customers', 'can_manage_finances'],
  },
  {
    to: buildPlatformPath('accounts'),
    label: 'Cuentas',
    icon: UsersIcon,
    permisos: ['can_attend_customers'],
  },
  {
    to: buildPlatformPath('topups'),
    label: 'Recargas',
    icon: PackageIcon,
    permisos: FINANZAS,
  },
  {
    to: buildPlatformPath('transactions'),
    label: 'Movimientos',
    icon: ReceiptIcon,
    permisos: FINANZAS,
  },
  {
    to: buildPlatformPath('pricing'),
    label: 'Precios y paquetes',
    icon: TagsIcon,
    permisos: FINANZAS,
  },
  {
    to: buildPlatformPath('history'),
    label: 'Historial de precios',
    icon: HistoryIcon,
    permisos: FINANZAS,
  },
  {
    to: buildPlatformPath('staff'),
    label: 'Personal',
    icon: UserCogIcon,
    permisos: ['can_manage_staff'],
  },
  {
    to: buildPlatformPath('activity'),
    label: 'Actividad del personal',
    icon: ActivityIcon,
    permisos: ['can_manage_staff'],
  },
  {
    to: buildPlatformPath('operations'),
    label: 'Operaciones',
    icon: MonitorCogIcon,
    permisos: ['can_attend_customers', 'can_manage_finances', 'can_manage_staff'],
  },
]

/** Mismas piezas que la barra del cliente, sin selector de organización:
 *  aquí se miran todas. */
export function PlatformSidebar({
  colapsada = false,
  onAlternar,
  className,
}: PropsDeBarra) {
  const { user } = useSession()
  const secciones = NAVEGACION.filter((seccion) =>
    seccion.permisos.some((permiso) => user?.[permiso]),
  )

  return (
    <Barra colapsada={colapsada} onAlternar={onAlternar} className={className}>
      <CabeceraDeBarra colapsada={colapsada} onAlternar={onAlternar} />

      <Identidad compacta={colapsada} permisos={describirPermisos(user)} />
      <Separator className="my-2" />

      <nav className="flex flex-col gap-0.5">
        {secciones.map(({ to, label, icon: Icono, end }) => (
          <Entrada
            key={to}
            to={to}
            label={label}
            icono={Icono}
            colapsada={colapsada}
            end={end}
          />
        ))}
      </nav>

      {/* Salida junto a la navegación, no en la cuenta: volver al panel es
          cambiar de sección, no cerrar sesión */}
      <nav className="mt-auto border-t pt-2">
        <Entrada
          to="/app/servers"
          label="Volver a mi panel"
          icono={ArrowLeftIcon}
          colapsada={colapsada}
        />
      </nav>

      <PieDeBarra colapsada={colapsada} />
    </Barra>
  )
}

/** En el sitio del selector: deja claro que se miran todas las
 *  organizaciones, y con qué permisos. */
function Identidad({ compacta, permisos }: { compacta: boolean; permisos: string }) {
  const bloque = (
    <div
      className={cn(
        'flex items-center gap-2.5 py-2',
        compacta ? 'justify-center' : 'px-2',
      )}
    >
      <span
        aria-hidden
        className="bg-primary/15 text-primary grid size-8 shrink-0 place-items-center rounded-md"
      >
        <ShieldCheckIcon className="size-4" />
      </span>
      {compacta ? (
        <span className="sr-only">Plataforma · {permisos}</span>
      ) : (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">Plataforma</span>
          <span className="text-muted-foreground block truncate text-xs">{permisos}</span>
        </span>
      )}
    </div>
  )

  if (!compacta) return bloque

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{bloque}</span>
      </TooltipTrigger>
      <TooltipContent side="right">Plataforma · {permisos}</TooltipContent>
    </Tooltip>
  )
}
