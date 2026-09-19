import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'

import dataCenter from '@/assets/data-center.webp'
import { BrandLockup } from '@/components/brand'
import { TerminalDemo } from '@/components/terminal-demo'
import { ThemeToggle } from '@/components/theme-toggle'

/** Acceso, registro, recuperación y verificación, sin navegación.
 *
 *  `fixed inset-0`, no `h-dvh`: fuera del flujo el body mide cero y la
 *  página no se desplaza ni por redondeo de subpíxel con zoom. Solo se
 *  desplaza la columna del formulario, en pantallas bajas.
 */
export function GuestLayout() {
  useLockDocumentScroll()

  return (
    <div className="fixed inset-0 grid overflow-hidden lg:grid-cols-[1fr_minmax(0,40rem)]">
      <ProofPanel />

      <div className="flex min-h-0 flex-col overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Link to="/" aria-label="Pilot SSH, inicio" className="lg:hidden">
            <BrandLockup />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/** Bloquea el desplazamiento del documento; se revierte al salir. */
function useLockDocumentScroll() {
  useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.add('sin-scroll-documento')
    return () => raiz.classList.remove('sin-scroll-documento')
  }, [])
}

function ProofPanel() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground relative isolate hidden min-h-0 flex-col overflow-hidden p-10 lg:flex xl:p-14">
      <Fondo />

      <Link to="/" aria-label="Pilot SSH, inicio" className="w-fit">
        <BrandLockup />
      </Link>

      <div className="flex flex-1 items-center">
        <div className="w-full max-w-lg">
          <TerminalDemo className="shadow-lg" />

          <p className="text-muted-foreground mt-6 text-sm">
            Nadie necesita saber la contraseña. La sesión queda registrada.
          </p>
        </div>
      </div>
    </aside>
  )
}

/** Foto decorativa, apagada y bajo un degradado al color del panel: el
 *  texto encima mantiene el contraste. */
const DIFUMINADO = 'linear-gradient(to right, #000 0%, #000 40%, transparent 94%)'

function Fondo() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      {/* Fondo CSS, no <img>: bajo lg el panel está oculto y el navegador
          no descarga un fondo que no se pinta */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55 dark:opacity-30"
        style={{
          backgroundImage: `url(${dataCenter})`,
          // Se disuelve antes del borde: sin costura contra el formulario
          maskImage: DIFUMINADO,
          WebkitMaskImage: DIFUMINADO,
        }}
      />
      <div className="from-sidebar via-sidebar/70 to-sidebar/35 absolute inset-0 bg-linear-to-t" />
    </div>
  )
}
