import { describe, expect, it } from 'vitest'

import {
  describirEstadoDeOrganizacion,
  tonoDeInsignia,
} from '@/features/backoffice/organizaciones'
import { buildCasePath, buildPlatformPath } from '@/features/backoffice/rutas'

describe('describirEstadoDeOrganizacion', () => {
  it('cada estado con su color', () => {
    expect(describirEstadoDeOrganizacion('active')).toEqual({
      etiqueta: 'Activa',
      tono: 'ok',
    })
    expect(describirEstadoDeOrganizacion('suspended')).toEqual({
      etiqueta: 'Suspendida',
      tono: 'peligro',
    })
  })
})

describe('tonoDeInsignia', () => {
  it('el saldo normal se pinta en verde; el resto conserva su tono', () => {
    expect(tonoDeInsignia('normal')).toBe('ok')
    expect(tonoDeInsignia('aviso')).toBe('aviso')
    expect(tonoDeInsignia('peligro')).toBe('peligro')
  })
})

describe('buildPlatformPath', () => {
  it('la casa, una sección y una sección acotada a una organización', () => {
    expect(buildPlatformPath()).toBe('/backoffice')
    expect(buildPlatformPath('topups')).toBe('/backoffice/topups')
    expect(buildPlatformPath('transactions', 'acme')).toBe(
      '/backoffice/transactions?organization=acme',
    )
  })
})

describe('buildCasePath', () => {
  it('la ficha de una organización y cada pestaña del caso', () => {
    expect(buildCasePath('acme')).toBe('/backoffice/organizations/acme')
    expect(buildCasePath('acme', 'access')).toBe('/backoffice/organizations/acme/access')
  })
})
