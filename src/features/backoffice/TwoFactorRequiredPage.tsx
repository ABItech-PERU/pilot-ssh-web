import { ArrowLeftIcon, ShieldAlertIcon, ShieldCheckIcon } from 'lucide-react'
import { Link } from 'react-router'

import { BrandLockup } from '@/components/brand'
import { Button } from '@/components/ui/button'

/** Personal sin dos pasos: el panel ve todas las organizaciones y una
 *  contraseña robada no debe bastar. Lleva a activarlos. */
export function TwoFactorRequiredPage() {
  return (
    <div className="grid min-h-pantalla place-items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <BrandLockup />
        <div className="bg-card flex w-full flex-col items-center gap-4 rounded-lg border p-6 sm:p-8">
          <span className="bg-warning/15 text-warning grid size-12 place-items-center rounded-full">
            <ShieldAlertIcon className="size-6" />
          </span>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Active la verificación en dos pasos
            </h1>
            <p className="text-muted-foreground text-sm">
              El panel de la plataforma muestra todas las organizaciones. Para entrar, su
              cuenta necesita un código en cada inicio de sesión.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link to="/app/settings?editar=dos-pasos">
                <ShieldCheckIcon />
                Activar dos pasos
              </Link>
            </Button>
            <Button asChild variant="outline" className="sm:flex-1">
              <Link to="/app/servers">
                <ArrowLeftIcon />
                Volver a mi panel
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
