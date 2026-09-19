import { describe, expect, it } from 'vitest'

import { buildHead } from '@/features/sitio/cabecera'
import { buscarPagina } from '@/features/sitio/paginas'
import {
  describirTarifa,
  diasQueCubre,
  EQUIPO_TIPICO,
  estimarCostoMensual,
} from '@/features/sitio/precios'
import type { PublicPricing, SiteInfo } from '@/types/api'

const PRECIOS: PublicPricing = {
  credit_price: '0.0100',
  currency: 'PEN',
  welcome_bonus: '500',
  rules: [
    {
      resource: 'member',
      resource_label: '',
      credits_per_day: '30.0000',
      free_allowance: 1,
    },
    {
      resource: 'server',
      resource_label: '',
      credits_per_day: '10.0000',
      free_allowance: 2,
    },
  ],
  packages: [],
}

const SITIO: SiteInfo = {
  support: {
    email: 'soporte@pilotssh.pe',
    phone: '+51 901 231 876',
    whatsapp: '51901231876',
  },
  company: {
    name: 'ABItech Perú',
    legal_name: 'ABItech Perú S.A.C.',
    ruc: '20123456789',
    address: '',
  },
  social: { facebook: 'https://www.facebook.com/peruabitech', linkedin: '', github: '' },
}

const OPCIONES = {
  sitioUrl: 'https://pilotssh.pe',
  imagenUrl: 'https://pilotssh.pe/og.png',
  logoUrl: 'https://pilotssh.pe/assets/abitech.webp',
  indexable: true,
}

describe('precios', () => {
  it('la tarifa en soles sale de los créditos y del precio del crédito', () => {
    expect(describirTarifa(PRECIOS, 'member')).toEqual({
      creditos: 30,
      soles: 0.3,
      gratis: 1,
    })
  })

  it('el costo del mes descuenta lo gratuito de cada día', () => {
    // (3 − 1) × 0,30 + (4 − 2) × 0,10 = 0,80 al día
    expect(estimarCostoMensual(PRECIOS, { personas: 3, servidores: 4, dias: 22 })).toBe(
      17.6,
    )
    expect(estimarCostoMensual(PRECIOS, { personas: 1, servidores: 2, dias: 30 })).toBe(0)
  })

  it('el regalo se traduce a días de uso de un equipo típico', () => {
    // 500 créditos entre 80 al día (2 personas y 2 servidores de más)
    expect(diasQueCubre(PRECIOS, '500', EQUIPO_TIPICO)).toBe(6)
    expect(diasQueCubre(PRECIOS, '500', { personas: 1, servidores: 2, dias: 22 })).toBe(
      Infinity,
    )
  })
})

describe('buildHead', () => {
  const cabecera = buildHead(
    buscarPagina('/pricing'),
    { sitio: SITIO, precios: PRECIOS },
    OPCIONES,
  )

  it('lleva título, canonical y la vista previa para compartir', () => {
    expect(cabecera).toContain(
      '<title>Precios de Pilot SSH · Pague en soles por día de uso</title>',
    )
    expect(cabecera).toContain(
      '<link rel="canonical" href="https://pilotssh.pe/pricing" />',
    )
    expect(cabecera).toContain(
      '<meta property="og:image" content="https://pilotssh.pe/og.png" />',
    )
    expect(cabecera).toContain(
      '<meta name="twitter:card" content="summary_large_image" />',
    )
  })

  it('los datos estructurados nombran a la empresa sin redes vacías', () => {
    const bloques = [
      ...cabecera.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
    ].map(([, json]) => JSON.parse(json!))
    const organizacion = bloques.find((bloque) => bloque['@type'] === 'Organization')
    expect(organizacion.taxID).toBe('20123456789')
    expect(organizacion.sameAs).toEqual(['https://www.facebook.com/peruabitech'])
    expect(bloques.map((bloque) => bloque['@type'])).toContain('SoftwareApplication')
  })

  it('un dato con </script> no rompe la página', () => {
    const conEtiqueta = {
      ...SITIO,
      company: { ...SITIO.company, address: '</script><b>' },
    }
    const html = buildHead(
      buscarPagina('/'),
      { sitio: conEtiqueta, precios: PRECIOS },
      OPCIONES,
    )
    expect(html).not.toContain('</script><b>')
  })

  it('fuera de producción pide no aparecer en Google', () => {
    expect(cabecera).toContain('<meta name="robots" content="index, follow" />')
    const pruebas = buildHead(
      buscarPagina('/'),
      { sitio: SITIO, precios: PRECIOS },
      { ...OPCIONES, indexable: false },
    )
    expect(pruebas).toContain('<meta name="robots" content="noindex, nofollow" />')
  })

  it('las páginas legales no llevan datos estructurados', () => {
    const legal = buildHead(
      buscarPagina('/terms'),
      { sitio: SITIO, precios: PRECIOS },
      OPCIONES,
    )
    expect(legal).not.toContain('application/ld+json')
  })
})
