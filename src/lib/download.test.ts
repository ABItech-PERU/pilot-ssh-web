import { describe, expect, it } from 'vitest'

import { nombreDeArchivo } from '@/lib/download'

describe('nombreDeArchivo', () => {
  it('lleva la marca delante: en descargas compite con todo lo demás', () => {
    expect(nombreDeArchivo('Historial', 'Precios y paquetes')).toBe(
      'Pilot SSH - Historial - Precios y paquetes.xlsx',
    )
    expect(nombreDeArchivo('Movimientos', '')).toBe('Pilot SSH - Movimientos.xlsx')
  })

  it('quita lo que Windows no admite, que haría fallar la descarga', () => {
    expect(nombreDeArchivo('Auditoría', 'Acme / Beta: 2026')).toBe(
      'Pilot SSH - Auditoría - Acme Beta 2026.xlsx',
    )
  })
})
