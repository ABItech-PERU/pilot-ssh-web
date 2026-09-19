import { cn } from 'cn'
import { PanelLeftCloseIcon } from 'lucide-react'
import { NavLink } from 'react-router'

import { BrandLockup, BrandMark } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserMenu } from '@/layouts/UserMenu'

export interface PropsDeBarra {
  /** Solo iconos: la barra cede espacio al trabajo. */
  colapsada?: boolean
  /** Sin él no hay control de plegar, como en el cajón móvil. */
  onAlternar?: () => void
  className?: string
}

/** Marco común de la barra del cliente y la de la plataforma: un solo
 *  dibujo para que pasar de una a otra no parezca cambiar de aplicación. */
export function Barra({
  colapsada = false,
  onAlternar,
  className,
  children,
}: PropsDeBarra & { children: React.ReactNode }) {
  return (
    <aside
      data-slot="app-sidebar"
      className={cn(
        'bg-sidebar border-sidebar-border relative flex h-full flex-col border-r p-3',
        className,
      )}
    >
      {colapsada && onAlternar && <Ampliar onAlternar={onAlternar} />}

      {/* Encima de la zona de ampliar por orden, no por `z-10`: una capa
          taparía la X del cajón móvil */}
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col gap-1',
          colapsada &&
            'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto',
        )}
      >
        {children}
      </div>
    </aside>
  )
}

export function CabeceraDeBarra({
  colapsada,
  onAlternar,
}: {
  colapsada: boolean
  onAlternar?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1 pb-2',
        colapsada ? 'justify-center' : 'px-1',
      )}
    >
      {colapsada ? <BrandMark /> : <BrandLockup />}
      {onAlternar && !colapsada && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground ml-auto"
          aria-label="Contraer la barra lateral"
          onClick={onAlternar}
        >
          <PanelLeftCloseIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}

/** Cuenta y tema al pie: donde se busca la cuenta por convención. */
export function PieDeBarra({
  colapsada,
  className,
}: {
  colapsada: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 border-t pt-2',
        colapsada && 'flex-col',
        className,
      )}
    >
      <UserMenu compacto={colapsada} className="min-w-0 flex-1" />
      <ThemeToggle />
    </div>
  )
}

/** Todo el carril salvo los iconos amplía la barra, con un clic y nunca
 *  al pasar el cursor: abrirse sola taparía el trabajo y parpadearía. */
function Ampliar({ onAlternar }: { onAlternar: () => void }) {
  return (
    <button
      type="button"
      data-slot="ampliar-barra"
      onClick={onAlternar}
      aria-label="Ampliar la barra lateral"
      className="focus-visible:outline-ring absolute inset-0 focus-visible:-outline-offset-2 focus-visible:outline-1"
    />
  )
}

export function Entrada({
  to,
  label,
  icono: Icono,
  colapsada,
  end = false,
}: {
  to: string
  label: string
  icono: React.ElementType
  colapsada: boolean
  /** Para la entrada raíz: si no, queda activa en todas las hijas. */
  end?: boolean
}) {
  const enlace = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md py-2 text-sm font-medium transition-colors',
          colapsada ? 'justify-center px-0' : 'px-2.5',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icono className="size-4 shrink-0" />
      {colapsada ? <span className="sr-only">{label}</span> : label}
    </NavLink>
  )

  // Plegada: solo icono; el nombre va en el tooltip
  if (!colapsada) return enlace

  // El disparador envuelve: `asChild` sobre NavLink uniría los `className`
  // como texto, y el de NavLink es una función
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{enlace}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
