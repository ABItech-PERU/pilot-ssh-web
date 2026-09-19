import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

import { buildConfigScript, readConfiguracion } from './scripts/configuracion.mjs'

const raiz = import.meta.dirname

/** En desarrollo sirve `/config.js` desde el .env. En Docker lo escribe el
 *  arranque del contenedor: la compilacion no depende del ambiente. */
function configuracionDelAmbiente(): Plugin {
  return {
    name: 'configuracion-del-ambiente',
    apply: (_, { command }) => command === 'serve' && !process.env.VITEST,
    configureServer(servidor) {
      const configuracion = readConfiguracion(loadEnv(servidor.config.mode, raiz, 'APP_'))
      servidor.middlewares.use('/config.js', (_, respuesta) => {
        respuesta.setHeader('Content-Type', 'text/javascript')
        respuesta.end(buildConfigScript(configuracion))
      })
    },
  }
}

export default defineConfig(({ isSsrBuild }) => {
  return {
    plugins: [react(), tailwindcss(), configuracionDelAmbiente()],
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
    // Solo en el contenedor de desarrollo (docker-compose.dev.yml)
    server: {
      host: '0.0.0.0',
      // El 80, como nginx en uat y prd: Swarm lo publica en WEB_PORT
      port: 80,
      strictPort: true,
      hmr: { clientPort: Number(process.env.WEB_PORT) || undefined },
      // Montado desde Windows, el contenedor no recibe eventos de archivos
      watch: { usePolling: true, interval: 300 },
      // Mismo origen: sin CORS. La API de desarrollo, por su nginx en el 8000;
      // sin changeOrigin, los enlaces a /media vuelven por aqui
      proxy: {
        '/api': { target: 'http://host.docker.internal:8000' },
        '/media': { target: 'http://host.docker.internal:8000' },
        '/ws': { target: 'ws://host.docker.internal:8000', ws: true },
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
