// Genera public/marca/manual-de-marca.png: la marca, sus colores, su letra y
// las reglas de uso en una sola imagen. Se corre tras exportar la marca:
// `node scripts/manual-de-marca.mjs`
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const marca = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/marca',
)
const svg = (nombre) => readFileSync(path.join(marca, `${nombre}.svg`), 'utf8')

const COLORES = [
  ['Teal', '#14b8a6', 'Símbolo y «SSH» sobre fondo oscuro; botones y acentos'],
  ['Teal hondo', '#0f766e', 'Símbolo y «SSH» sobre fondo claro; bandas de los correos'],
  ['Teal claro', '#5eead4', 'Detalles pequeños sobre oscuro: iconos, cursor'],
  ['Noche', '#0b0f14', 'Fondo oscuro de la marca, cabeceras y correos'],
  ['Tinta', '#0f172a', 'Texto sobre fondo claro'],
  ['Gris', '#9aa7b8', 'Texto secundario sobre oscuro'],
  ['Éxito', '#4ade80', 'Solo en la terminal: «acceso concedido»'],
]

const html = `<!doctype html>
<html lang="es"><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 1400px; font-family: Inter, sans-serif; color: #0f172a; background: #fff; padding: 72px 80px }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -.02em }
  .sub { margin-top: 8px; color: #64748b; font-size: 16px }
  h2 { margin-top: 56px; font-size: 13px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #64748b; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0 }
  .rejilla { display: grid; gap: 16px; margin-top: 20px }
  .c2 { grid-template-columns: 1fr 1fr } .c3 { grid-template-columns: 1fr 1fr 1fr } .c4 { grid-template-columns: repeat(4, 1fr) }
  .caja { border: 1px solid #e2e8f0; border-radius: 8px; padding: 26px; display: flex; align-items: center; justify-content: center; min-height: 150px; position: relative }
  .oscuro { background: #0b0f14; border-color: #0b0f14 }
  .pie { position: absolute; left: 12px; bottom: 10px; font-size: 11px; color: #94a3b8; letter-spacing: .04em }
  .oscuro .pie { color: #64748b }
  .caja svg { height: 64px; width: auto } .caja.grande svg { height: 84px } .caja.isotipo svg { height: 110px } .caja.apilado svg { height: 150px }
  .muestra { border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0 }
  .muestra .tono { height: 88px } .muestra .datos { padding: 12px 14px }
  .muestra b { display: block; font-size: 14px } .muestra code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #475569 }
  .muestra p { margin-top: 6px; font-size: 12px; color: #64748b; line-height: 1.45 }
  .letra { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px 28px }
  .letra .nombre { font-size: 13px; color: #64748b; font-weight: 600; letter-spacing: .06em; text-transform: uppercase }
  .letra .ejemplo { margin-top: 12px; font-size: 40px; font-weight: 800; letter-spacing: .02em; line-height: 1.1 }
  .letra .ejemplo.mono { font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 26px; letter-spacing: 0 }
  .letra .nota { margin-top: 12px; font-size: 13px; color: #475569; line-height: 1.55 }
  .regla { border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; font-size: 14px; line-height: 1.5; display: flex; gap: 12px; align-items: flex-start }
  .regla i { font-style: normal; font-weight: 700; flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 13px }
  .si i { background: #ccfbf1; color: #0f766e } .no i { background: #fee2e2; color: #b91c1c }
  .medida { display: flex; gap: 40px; align-items: center; margin-top: 20px }
  .medida .caja { flex: 1 }
  .lista { margin-top: 18px; font-size: 14px; line-height: 1.7; columns: 2; column-gap: 40px }
  .lista code { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #0f766e }
  .respeto { position: relative; display: inline-block; padding: 24px }
  .respeto:before { content: ''; position: absolute; inset: 0; border: 1px dashed #94a3b8; border-radius: 4px }
  .respeto:after { content: 'X'; position: absolute; left: 6px; top: 2px; font-size: 11px; color: #64748b }
</style></head>
<body>
  <h1>Manual de marca · Pilot SSH</h1>
  <p class="sub">Un solo trazo: el prompt de la terminal que dibuja su propia línea. Versión 1 · septiembre de 2026</p>

  <h2>Marca principal</h2>
  <div class="rejilla c2">
    <div class="caja oscuro grande">${svg('imagotipo-oscuro')}<span class="pie">IMAGOTIPO · FONDO OSCURO</span></div>
    <div class="caja grande">${svg('imagotipo-claro')}<span class="pie">IMAGOTIPO · FONDO CLARO</span></div>
  </div>
  <div class="rejilla c4">
    <div class="caja oscuro isotipo">${svg('isotipo-oscuro')}<span class="pie">ISOTIPO</span></div>
    <div class="caja oscuro">${svg('etiqueta-oscuro')}<span class="pie">ETIQUETA · ESPACIOS ESTRECHOS</span></div>
    <div class="caja oscuro apilado">${svg('apilado-oscuro')}<span class="pie">APILADO · USOS CUADRADOS</span></div>
    <div class="caja">${svg('imagotipo-una-tinta')}<span class="pie">UNA TINTA · IMPRESIÓN</span></div>
  </div>

  <h2>Construcción</h2>
  <div class="medida">
    <div class="caja"><span class="respeto">${svg('imagotipo-claro')}</span><span class="pie">ÁREA DE RESPETO: X = ALTURA DE LAS MAYÚSCULAS</span></div>
    <div class="lista" style="columns: 1; flex: 1">
      El trazo mide 10/64 del alto del símbolo, con puntas y uniones redondas.<br>
      En el imagotipo la cola termina justo bajo la L de PILOT; en el símbolo solo, es corta.<br>
      Nada se acerca más de X a la marca: ni texto, ni bordes, ni otros logos.<br>
      Tamaño mínimo: imagotipo 110 px de ancho (26 mm impreso); isotipo 16 px.<br>
      En pestaña, icono de app y avatar el símbolo va en caja Noche con radio del 22 %.
    </div>
  </div>

  <h2>Colores</h2>
  <div class="rejilla c4">
    ${COLORES.map(
      ([nombre, hex, uso]) =>
        `<div class="muestra"><div class="tono" style="background:${hex}"></div><div class="datos"><b>${nombre}</b><code>${hex}</code><p>${uso}</p></div></div>`,
    ).join('')}
  </div>

  <h2>Tipografía</h2>
  <div class="rejilla c2">
    <div class="letra"><div class="nombre">Inter · marca y textos</div><div class="ejemplo">PILOT SSH</div><div class="nota">La palabra va en Inter 800, mayúsculas, con un espaciado del 2 %, y ya está convertida a trazados en los archivos. En la web y los correos, Inter de 400 a 700; nunca otra fuente para la palabra.</div></div>
    <div class="letra"><div class="nombre">JetBrains Mono · terminal y datos técnicos</div><div class="ejemplo mono">$ ssh prod-web ✓ Acceso concedido</div><div class="nota">Comandos, códigos de verificación, direcciones y huellas. Es la voz del producto: cuando aparece, algo técnico está ocurriendo.</div></div>
  </div>

  <h2>Uso</h2>
  <div class="rejilla c3">
    <div class="regla si"><i>✓</i><span>Usar los archivos de <code>public/marca/</code> tal cual, sin redibujar.</span></div>
    <div class="regla si"><i>✓</i><span>Sobre oscuro, la versión oscura; sobre claro, la clara; en impresión, la de una tinta.</span></div>
    <div class="regla si"><i>✓</i><span>Fondos planos: Noche, blanco o una foto oscurecida.</span></div>
    <div class="regla no"><i>✕</i><span>Sin degradados, sombras, brillos ni contornos.</span></div>
    <div class="regla no"><i>✕</i><span>No estirar, girar, recolorear ni separar el símbolo de la palabra a otra distancia.</span></div>
    <div class="regla no"><i>✕</i><span>Sin caja alrededor del imagotipo; la caja es solo para pestaña, icono y avatar.</span></div>
  </div>

  <h2>Archivos</h2>
  <div class="lista">
    <code>imagotipo-oscuro / -claro / -una-tinta</code> · SVG, PNG y WebP<br>
    <code>isotipo-oscuro / -claro</code> · SVG; <code>isotipo-512.png</code><br>
    <code>logotipo-oscuro / -claro</code> · solo la palabra<br>
    <code>etiqueta-oscuro / -claro</code> · SVG, PNG y WebP<br>
    <code>apilado-oscuro / -claro</code> · SVG, PNG y WebP<br>
    <code>avatar-512.png</code> · perfil en redes<br>
    <code>favicon.svg</code>, <code>apple-touch-icon.png</code>, <code>icon-512.png</code> · pestaña y móvil<br>
    <code>og.png</code> · vista previa al compartir un enlace
  </div>
</body></html>`

const navegador = await chromium.launch()
const pagina = await navegador.newPage({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
})
await pagina.setContent(html, { waitUntil: 'networkidle' })
await pagina.evaluate(() => document.fonts.ready)
const destino = path.join(marca, 'manual-de-marca.png')
await pagina.screenshot({ path: destino, fullPage: true })
await navegador.close()
console.log(`Listo: ${destino}`)
