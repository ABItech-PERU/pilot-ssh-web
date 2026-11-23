import { afterEach, describe, expect, it, vi } from 'vitest'

import { abrirDescarga, fetchUrlDeDescarga } from '@/features/terminal/descarga'

describe('fetchUrlDeDescarga', () => {
  it('apunta a la API, que es otro dominio', () => {
    expect(fetchUrlDeDescarga('/ws/descargas/vale', 'https://api.pilotssh.pe')).toBe(
      'https://api.pilotssh.pe/ws/descargas/vale',
    )
  })

  it('sin API configurada usa el dominio de la página', () => {
    expect(fetchUrlDeDescarga('/ws/descargas/vale', '')).toBe(
      `${window.location.origin}/ws/descargas/vale`,
    )
  })
})

describe('abrirDescarga', () => {
  afterEach(() => vi.restoreAllMocks())

  it('entrega el enlace al gestor de descargas del navegador sin dejar rastro', () => {
    const pulsar = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    abrirDescarga('/ws/descargas/vale', 'https://api.pilotssh.pe')

    const enlace = pulsar.mock.contexts[0] as HTMLAnchorElement
    expect(enlace.href).toBe('https://api.pilotssh.pe/ws/descargas/vale')
    expect(enlace.isConnected).toBe(false)
  })
})
