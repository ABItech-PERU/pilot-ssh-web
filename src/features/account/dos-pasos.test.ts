import { describe, expect, it } from 'vitest'

import {
  agruparClave,
  describirDosPasos,
  quedanPocosRespaldos,
  textoDeRespaldo,
} from '@/features/account/dos-pasos'

describe('describirDosPasos', () => {
  it('sin activar da igual el método guardado', () => {
    expect(
      describirDosPasos({ two_factor_enabled: false, two_factor_method: 'app' }),
    ).toBe('desactivada')
  })

  it('activada dice con qué', () => {
    expect(
      describirDosPasos({ two_factor_enabled: true, two_factor_method: 'app' }),
    ).toBe('app')
    expect(
      describirDosPasos({ two_factor_enabled: true, two_factor_method: 'email' }),
    ).toBe('correo')
  })
})

describe('agruparClave', () => {
  it('de cuatro en cuatro, sin espacio al final', () => {
    expect(agruparClave('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP')
    expect(agruparClave('ABCDEF')).toBe('ABCD EF')
  })
})

describe('quedanPocosRespaldos', () => {
  it('avisa con tres o menos, y no sin la app', () => {
    expect(quedanPocosRespaldos(3)).toBe(true)
    expect(quedanPocosRespaldos(4)).toBe(false)
    expect(quedanPocosRespaldos(null)).toBe(false)
  })
})

describe('textoDeRespaldo', () => {
  it('lleva la cuenta, la fecha y los códigos numerados', () => {
    const texto = textoDeRespaldo(
      ['abcde-fghjk', 'mnpqr-stuvw'],
      'ana@acme.pe',
      new Date('2026-09-21T15:00:00Z'),
    )

    expect(texto).toContain('Cuenta: ana@acme.pe')
    expect(texto).toContain('Generados: 2026-09-21')
    expect(texto).toContain(' 1. abcde-fghjk')
    expect(texto).toContain(' 2. mnpqr-stuvw')
  })
})
