import { chromium } from 'playwright'

const BASE = 'http://localhost:5190'
const salida = process.argv[2] ?? '.'

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: 1000, height: 700 },
  colorScheme: 'dark',
})
const pagina = await contexto.newPage()

await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await pagina.getByLabel('Correo').fill('ana@acme.pe')
await pagina.getByLabel('Contraseña', { exact: true }).fill('12345678')
await pagina.getByRole('button', { name: 'Iniciar sesión' }).click()
await pagina.waitForURL(/\/(app|onboarding)/)

await pagina.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle' })

const campo = pagina.getByLabel('Nombre y apellidos')
await campo.fill('abimael fernandez de la cruz')
await campo.blur()
await pagina.waitForTimeout(300)
await pagina.screenshot({ path: `${salida}/sugerencia-antes.png` })

await pagina.getByRole('button', { name: /Abimael/ }).click()
await pagina.waitForTimeout(300)
console.log('aplicado ->', await campo.inputValue())
await pagina.screenshot({ path: `${salida}/sugerencia-despues.png` })

await navegador.close()
