import { cn } from 'cn'
import { MenuIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import { BrandLockup } from '@/components/brand'
import { CloseButton } from '@/components/close-button'
import { Container } from '@/components/container'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import type { PropsDeBarra } from '@/layouts/sidebar-parts'
import { UserMenu } from '@/layouts/UserMenu'
import { useSidebar } from '@/layouts/use-sidebar'

interface Props {
  /** Se pinta dos veces: fija en escritorio y en el cajón en móvil. */
  barra: (props: PropsDeBarra) => React.ReactNode
  /** Descripción del cajón móvil para el lector de pantalla. */
  descripcionDelMenu: string
  /** Encima de cada pantalla. */
  avisos?: React.ReactNode
}

/** Barra plegable, cajón en móvil y contenido. Compartido por el panel del
 *  cliente y el de la plataforma: pasar de uno a otro no parece salir. */
export function Shell({ barra, descripcionDelMenu, avisos }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { colapsada, alternar } = useSidebar()
  const { pathname } = useLocation()

  // Al navegar se cierra el cajón móvil, que taparía el destino
  useEffect(() => setMenuAbierto(false), [pathname])

  return (
    <div
      className={cn(
        'bg-background min-h-pantalla lg:grid',
        colapsada ? 'lg:grid-cols-[4rem_1fr]' : 'lg:grid-cols-[17.5rem_1fr]',
      )}
    >
      <div className="top-aviso h-pantalla sticky hidden lg:block">
        {barra({ colapsada, onAlternar: alternar })}
      </div>

      {/* En móvil el menú ocupa toda la pantalla: a medias, el contenido
          detrás confunde */}
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-full max-w-none gap-0 p-0"
        >
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">{descripcionDelMenu}</SheetDescription>
          <SheetClose asChild>
            <CloseButton className="z-10" />
          </SheetClose>
          {barra({ className: 'border-r-0' })}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-col">
        <header className="bg-background/85 top-aviso sticky z-30 border-b backdrop-blur lg:hidden">
          <Container className="flex h-14 items-center gap-2 lg:justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto(true)}
            >
              <MenuIcon className="size-4" />
            </Button>
            <BrandLockup className="lg:hidden" />

            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <UserMenu compacto />
            </div>
          </Container>
        </header>

        <main className="min-w-0 flex-1 py-6 lg:py-8">
          <Container>
            {avisos}
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  )
}
