import { describe, expect, it } from 'vitest'

import { buildSlug } from '@/lib/slug'

describe('buildSlug', () => {
  it('propone la direccion a partir del nombre', () => {
    expect(buildSlug('Acme Perú')).toBe('acme-peru')
  })

  it('quita los signos que no caben en una direccion', () => {
    expect(buildSlug('  ¡Tienda & Cía!  ')).toBe('tienda-cia')
  })

  it('sin nada que convertir devuelve vacio, no un guion suelto', () => {
    expect(buildSlug('¿?')).toBe('')
  })
})
