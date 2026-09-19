import { RotateCwIcon } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { Button } from '@/components/ui/button'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** Ultima red bajo toda la aplicacion: sin esto, un fallo al pintar deja la
 *  pagina en blanco y el usuario sin saber si fue el o fue el producto. */
export function ErrorPage() {
  const error = useRouteError()

  // Una ruta que no existe no es un fallo: tiene su propia pantalla
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  return (
    <div className="grid min-h-pantalla place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Algo se rompió en esta pantalla
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Vuelva a cargar la página. Si sigue igual, escríbanos.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCwIcon />
            Recargar
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>

        <TechnicalDetail error={error} />
      </div>
    </div>
  )
}

/** Solo en desarrollo: en produccion la traza delata rutas y estructura. */
function TechnicalDetail({ error }: { error: unknown }) {
  if (!import.meta.env.DEV) return null

  const detalle =
    error instanceof Error ? `${error.message}\n\n${error.stack ?? ''}` : String(error)

  return (
    <details className="mt-8 text-left">
      <summary className="text-muted-foreground cursor-pointer text-xs">
        Detalle técnico (solo en desarrollo)
      </summary>
      <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-[11px] whitespace-pre-wrap">
        {detalle}
      </pre>
    </details>
  )
}
