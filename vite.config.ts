import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const raiz = import.meta.dirname

const LOCALES = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])
const AMBIENTES = ['dev', 'uat', 'prd']

/** Se incrustan al compilar: vacías o locales, la web publicada no funciona. */
function assertPublicUrl(nombre: string, valor: string | undefined) {
  let url: URL | null = null
  try {
    url = new URL(valor ?? '')
  } catch {
    // Vacía o mal escrita
  }
  if (url?.protocol === 'https:' && !LOCALES.has(url.hostname)) return

  throw new Error(
    `${nombre} tiene que ser pública y con https, y es «${valor ?? ''}». ` +
      'Póngala en el .env.',
  )
}

export default defineConfig(({ command, mode, isSsrBuild }) => {
  const entorno = loadEnv(mode, raiz, 'VITE_')
  if (!AMBIENTES.includes(entorno.VITE_APP_ENV ?? '')) {
    throw new Error(
      `VITE_APP_ENV debe ser ${AMBIENTES.join(', ')}; en el .env dice «${entorno.VITE_APP_ENV ?? ''}».`,
    )
  }
  if (command === 'build') {
    assertPublicUrl('VITE_API_URL', entorno.VITE_API_URL)
    assertPublicUrl('VITE_SITE_URL', entorno.VITE_SITE_URL)
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': `${raiz}/src` },
    },
    // El prerenderizado corre en Node: todo empaquetado, sin node_modules
    ssr: isSsrBuild ? { noExternal: true } : undefined,
    build: {
      rollupOptions: {
        output: {
          // Vendors aparte: cambiar codigo propio no invalida su cache
          manualChunks(id) {
            // Rollup usa separadores de Windows en las rutas de este sistema
            const ruta = id.replaceAll('\\', '/')
            if (!ruta.includes('/node_modules/')) return

            if (/\/node_modules\/(react|react-dom|react-router|scheduler)\//.test(ruta)) {
              return 'react'
            }
            if (/\/node_modules\/(@tanstack|axios)\//.test(ruta)) return 'data'
          },
        },
      },
    },
    server: {
      port: 5173,
      // Mismo origen en desarrollo: sin CORS ni cambios en el backend
      proxy: {
        '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      css: false,
    },
  }
})
