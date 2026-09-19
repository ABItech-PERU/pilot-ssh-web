import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const OPCIONES = [
  { valor: 'light', etiqueta: 'Claro', icono: SunIcon },
  { valor: 'dark', etiqueta: 'Oscuro', icono: MoonIcon },
  { valor: 'system', etiqueta: 'Sistema', icono: MonitorIcon },
] as const

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const Icono = resolvedTheme === 'dark' ? MoonIcon : SunIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar apariencia">
          <Icono className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPCIONES.map(({ valor, etiqueta, icono: Opcion }) => (
          <DropdownMenuItem
            key={valor}
            onSelect={() => setTheme(valor)}
            className={theme === valor ? 'bg-accent text-accent-foreground' : undefined}
          >
            <Opcion className="size-4" />
            {etiqueta}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
