import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { BrandLockup } from '@/components/brand'
import { Container } from '@/components/container'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { VolverArriba } from '@/components/volver-arriba'
import { useSession } from '@/features/auth/session'
import { useDesplazamientoAlNavegar } from '@/lib/use-desplazamiento'
import { PublicFooter } from '@/layouts/PublicFooter'

const ENLACES = [
  { to: '/#como-funciona', label: 'Cómo funciona' },
  { to: '/pricing', label: 'Precios' },
  { to: '/security', label: 'Seguridad' },
] as const

/** Sitio público: se compila a HTML y se indexa. */
export function PublicLayout() {
  useDesplazamientoAlNavegar()

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <VolverArriba />
    </div>
  )
}

function PublicHeader() {
  const { isAuthenticated } = useSession()
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-lg">
      <Container className="flex h-16 items-center gap-8">
        <Link to="/" aria-label="Pilot SSH, inicio">
          <BrandLockup />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {ENLACES.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `hover:text-foreground rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  // Un ancla de la landing no es página: no se marca activa
                  isActive && !to.includes('#')
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link to="/app/servers">Ir al panel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/register">Crear cuenta</Link>
              </Button>
            </>
          )}

          <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <SheetDescription className="sr-only">Secciones del sitio</SheetDescription>
              <BrandLockup />
              <nav aria-label="Secciones" className="mt-8 flex flex-col gap-1">
                {ENLACES.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuAbierto(false)}
                    className="hover:bg-accent rounded-md px-3 py-2.5 text-base font-medium"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              {!isAuthenticated && (
                <div className="mt-8 grid gap-2">
                  <Button asChild>
                    <Link to="/register" onClick={() => setMenuAbierto(false)}>
                      Crear cuenta gratis
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/login" onClick={() => setMenuAbierto(false)}>
                      Iniciar sesión
                    </Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}
