import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="grid min-h-pantalla place-items-center px-6">
      <div className="text-center">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Esta página no existe</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          El enlace está mal escrito o la página se movió.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
