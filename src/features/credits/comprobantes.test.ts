import { describe, expect, it } from 'vitest'

import { nombreDelComprobante, tipoDeComprobante } from '@/features/credits/comprobantes'

describe('tipoDeComprobante', () => {
  it('el PDF es un documento y lo demás, una imagen', () => {
    expect(tipoDeComprobante('pdf')).toBe('pdf')
    expect(tipoDeComprobante('jpg')).toBe('imagen')
    expect(tipoDeComprobante('png')).toBe('imagen')
    expect(tipoDeComprobante('webp')).toBe('imagen')
  })
})

describe('nombreDelComprobante', () => {
  it('dice de qué es, con la extensión del archivo', () => {
    expect(
      nombreDelComprobante('pdf', { paquete: 'Recarga S/ 50', operacion: 'BCP-778812' }),
    ).toBe('Comprobante Recarga S 50 BCP-778812.pdf')
  })

  it('sin operación, solo el paquete', () => {
    expect(nombreDelComprobante('jpg', { paquete: 'Recarga S/ 20', operacion: '' })).toBe(
      'Comprobante Recarga S 20.jpg',
    )
  })
})
