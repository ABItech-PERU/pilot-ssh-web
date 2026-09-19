import { Loader2Icon } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { getDesvioDelAlta } from '@/features/auth/alta'
import { useSession } from '@/features/auth/session'
import { esPersonal, faltanDosPasos } from '@/features/backoffice/permisos'
import { TwoFactorRequiredPage } from '@/features/backoffice/TwoFactorRequiredPage'

/** Comodidad de navegación, no control de acceso: decide el backend en
 *  cada petición. Única puerta de lo privado: aquí se exige el alta. */
export function RequireAuth() {
  const { user, isAuthenticated, isResolving } = useSession()
  const ubicacion = useLocation()

  if (isResolving) return <PantallaDeEspera />

  if (!isAuthenticated || !user) {
    // Destino guardado para volver ahí tras entrar
    return <Navigate to="/login" state={{ from: ubicacion.pathname }} replace />
  }

  const desvio = getDesvioDelAlta(user.onboarding.completed, ubicacion.pathname)
  if (desvio) return <Navigate to={desvio} replace />

  return <Outlet />
}

export function RequireGuest() {
  const { isAuthenticated, isResolving } = useSession()

  if (isResolving) return <PantallaDeEspera />
  if (isAuthenticated) return <Navigate to="/app/servers" replace />

  return <Outlet />
}

/** Dentro de `RequireAuth`. Quien no es del personal vuelve a su panel, sin
 *  «sin permiso» que delate la plataforma. Personal sin dos pasos: ve cómo
 *  activarlos. */
export function RequirePlatformStaff() {
  const { user } = useSession()

  if (!esPersonal(user)) return <Navigate to="/app/servers" replace />
  if (faltanDosPasos(user)) return <TwoFactorRequiredPage />

  return <Outlet />
}

function PantallaDeEspera() {
  return (
    <div
      className="grid min-h-pantalla place-items-center"
      role="status"
      aria-live="polite"
    >
      <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
      <span className="sr-only">Comprobando tu sesión</span>
    </div>
  )
}
