import { chromium } from 'playwright'

/** Capturas de una pantalla en claro/oscuro y en escritorio/movil.
 *
 *  Uso: node scripts/capturar.mjs <carpeta> [ruta] [--auth]
 *  Con --auth inicia sesion antes: las rutas privadas redirigen sin ella.
 */
const [salida = '.', ruta = '/login', ...banderas] = process.argv.slice(2)
const conSesion = banderas.includes('--auth')

const BASE = 'http://localhost:5190'
const DEMO = { email: 'ana@acme.pe', password: '12345678' }

const TAMANOS = [
  { nombre: 'escritorio', viewport: { width: 1600, height: 900 } },
  { nombre: 'movil', viewport: { width: 390, height: 844 }, isMobile: true },
]

const navegador = await chromium.launch()

for (const { nombre, viewport } of TAMANOS) {
  for (const colorScheme of ['light', 'dark']) {
    const contexto = await navegador.newContext({ viewport, colorScheme })
    const pagina = await contexto.newPage()

    if (conSesion) {
      await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
      await pagina.getByLabel('Correo').fill(DEMO.email)
      await pagina.getByLabel('Contraseña', { exact: true }).fill(DEMO.password)
      await pagina.getByRole('button', { name: 'Iniciar sesión' }).click()
      await pagina.waitForURL(/\/(app|onboarding)/, { timeout: 15000 })
    }

    await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' })
    // La terminal del login se escribe sola: se espera al guion completo
    await pagina.waitForTimeout(ruta === '/login' ? 6000 : 800)

    const archivo = `${salida}/${ruta.replaceAll('/', '_') || 'raiz'}-${nombre}-${colorScheme}.png`
    await pagina.screenshot({ path: archivo, fullPage: nombre === 'movil' })
    console.log(archivo)

    await contexto.close()
  }
}

await navegador.close()
