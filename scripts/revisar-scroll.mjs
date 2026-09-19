import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const navegador = await chromium.launch()

for (const ruta of ['/login', '/register']) {
  let umbral = null

  for (let height = 900; height >= 380; height -= 10) {
    const pagina = await navegador.newPage({ viewport: { width: 1600, height } })
    await pagina.goto(BASE + ruta, { waitUntil: 'domcontentloaded' })
    await pagina.waitForTimeout(150)

    const hay = await pagina.evaluate(() => {
      const raiz = document.documentElement
      if (raiz.scrollHeight - raiz.clientHeight > 1) return 'pagina'

      for (const nodo of document.querySelectorAll('*')) {
        if (nodo.scrollHeight - nodo.clientHeight > 1) {
          const estilo = getComputedStyle(nodo)
          if (estilo.overflowY === 'auto' || estilo.overflowY === 'scroll') {
            return `${nodo.tagName.toLowerCase()}.${(nodo.className?.toString?.() ?? '')
              .split(' ')
              .slice(0, 3)
              .join('.')} (+${nodo.scrollHeight - nodo.clientHeight}px)`
          }
        }
      }
      return null
    })

    await pagina.close()

    if (hay) {
      umbral = { height, hay }
      break
    }
  }

  console.log(
    umbral
      ? `${ruta}: aparece scroll por debajo de ${umbral.height + 10}px de alto -> ${umbral.hay}`
      : `${ruta}: sin scroll hasta 380px de alto`,
  )
}

await navegador.close()
