// Primero: los esquemas de zod se crean al importar cada módulo
import '@/lib/zod-sin-eval'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from '@/features/auth/session'
import { seedSiteData } from '@/features/sitio/datos-incrustados'
import { queryClient } from '@/lib/query-client'
import { router } from '@/routes/router'

import '@/index.css'

const contenedor = document.getElementById('root')
// Sin #root, fallo explícito en vez de una página en blanco
if (!contenedor) throw new Error('Falta el elemento #root en index.html')

seedSiteData(queryClient)
// Página prerenderizada: la animación de entrada sigue donde iba
if (contenedor.children.length > 0) {
  document.documentElement.style.setProperty(
    '--entrada-desde',
    `-${Math.round(performance.now())}ms`,
  )
}

createRoot(contenedor).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SessionProvider>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" richColors closeButton />
          </SessionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
