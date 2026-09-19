// Genera public/og.png, la vista previa al compartir un enlace. Se corre a
// mano al cambiar el mensaje: `node scripts/imagen-para-compartir.mjs`
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const publico = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const destino = path.join(publico, 'og.png')
const marca = readFileSync(path.join(publico, 'marca/imagotipo-oscuro.svg'), 'utf8')

// Se ve en miniatura y a veces recortada a cuadrado (WhatsApp): todo al
// centro, pocas palabras y grandes
const html = `<!doctype html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 1200px; height: 630px; font-family: Inter, sans-serif; color: #eef2f7;
    background: #0b0f14; padding: 64px 120px; overflow: hidden; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between }
  .marca svg { height: 52px }
  h1 { font-size: 58px; line-height: 1.1; letter-spacing: -1.5px; font-weight: 600; max-width: 630px }
  h1 em { font-style: normal; color: #9aa7b8 }
  .terminal { display: flex; align-items: center; gap: 28px; padding: 22px 36px; border: 1px solid #263241;
    border-radius: 8px; background: #10161e; font-family: 'JetBrains Mono', monospace; font-size: 30px }
  .dim { color: #7d8a9c } .ok { color: #4ade80 }
  .regalo { display: flex; align-items: center; gap: 14px; font-size: 30px; color: #9aa7b8 }
  .regalo b { color: #eef2f7; font-weight: 600 }
  .regalo svg { color: #5eead4 }
</style></head>
<body>
  <div class="marca">${marca}</div>
  <h1>Dé acceso a sus servidores <em>sin entregar contraseñas</em></h1>
  <div class="terminal">
    <span class="dim">$ ssh prod-web</span>
    <span class="ok">✓ Acceso concedido</span>
  </div>
  <div class="regalo">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>
    <span><b>500 créditos de regalo</b> al registrarse</span>
  </div>
</body></html>`

const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } })
await pagina.setContent(html, { waitUntil: 'networkidle' })
await pagina.evaluate(() => document.fonts.ready)
await pagina.screenshot({ path: destino })
await navegador.close()
console.log(`Listo: ${destino}`)
