import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router'

import abitechPeru from '@/assets/abitech-peru.webp'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from '@/features/auth/session'
import { clavesDelSitio } from '@/features/sitio/api'
import { buildHead } from '@/features/sitio/cabecera'
import type { DatosDelSitio } from '@/features/sitio/datos-incrustados'
import { PAGINAS_PUBLICAS } from '@/features/sitio/paginas'
import { rutas } from '@/routes/rutas'

/** Entrada de `scripts/prerender.mjs`: el HTML de las páginas públicas. */
export { buildHead, PAGINAS_PUBLICAS }

export const LOGO = abitechPeru

export async function renderPage(
  ruta: string,
  datos: DatosDelSitio,
  sitioUrl: string,
): Promise<string> {
  const handler = createStaticHandler(rutas)
  const contexto = await handler.query(new Request(`${sitioUrl}${ruta}`))
  if (contexto instanceof Response) throw new Error(`${ruta} redirige`)

  // Sin limpieza diferida: sus temporizadores no dejarían terminar a Node
  const cliente = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  cliente.setQueryData(clavesDelSitio.sitio, datos.sitio)
  cliente.setQueryData(clavesDelSitio.precios, datos.precios)

  return renderToString(
    <QueryClientProvider client={cliente}>
      <ThemeProvider>
        <TooltipProvider>
          <SessionProvider>
            {/* Sin hidratación: evita un script en línea que la CSP bloquea */}
            <StaticRouterProvider
              router={createStaticRouter(handler.dataRoutes, contexto)}
              context={contexto}
              hydrate={false}
            />
          </SessionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}
