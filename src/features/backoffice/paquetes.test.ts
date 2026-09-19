import { describe, expect, it } from 'vitest'

import {
  columnasDePaquetes,
  conListaDesplegable,
  creditosPorPrecio,
  describirPrecioPorCredito,
  formatearUnitario,
  diaAInstante,
  instanteADia,
  porcentajeDeRegalo,
  regaloEnCreditos,
  regaloEnPorcentaje,
  precioPorCredito,
  seOfreceAhora,
} from '@/features/backoffice/paquetes'

describe('columnasDePaquetes', () => {
  it('reparte sin dejar filas cojas', () => {
    expect(columnasDePaquetes(3)).toBe(3)
    expect(columnasDePaquetes(6)).toBe(3)
    expect(columnasDePaquetes(4)).toBe(2)
    expect(columnasDePaquetes(2)).toBe(2)
  })

  it('lo que no cuadra con ninguna va de tres', () => {
    expect(columnasDePaquetes(5)).toBe(3)
    expect(columnasDePaquetes(1)).toBe(3)
  })
})

describe('conListaDesplegable', () => {
  it('con muchos, una lista; con pocos, las fichas', () => {
    expect(conListaDesplegable(6)).toBe(false)
    expect(conListaDesplegable(7)).toBe(true)
  })
})

describe('porcentajeDeRegalo', () => {
  it('lo que regala sobre lo que se paga', () => {
    expect(porcentajeDeRegalo({ credits: '5000', bonus_credits: '500' })).toBe(10)
    expect(porcentajeDeRegalo({ credits: '10000', bonus_credits: '2000' })).toBe(20)
  })

  it('sin regalo no hay nada que anunciar', () => {
    expect(porcentajeDeRegalo({ credits: '2000', bonus_credits: '0' })).toBeNull()
  })

  it('un regalo que redondea a cero tampoco se anuncia', () => {
    expect(porcentajeDeRegalo({ credits: '10000', bonus_credits: '20' })).toBeNull()
  })

  it('un paquete sin créditos no divide entre cero', () => {
    expect(porcentajeDeRegalo({ credits: '0', bonus_credits: '500' })).toBeNull()
  })
})

describe('precioPorCredito', () => {
  it('baja con el bono, que es de lo que sirve mirarlo', () => {
    expect(precioPorCredito('20', '2000')).toBeCloseTo(0.01, 5)
    expect(precioPorCredito('100', '12000')).toBeCloseTo(0.008333, 5)
  })

  it('un paquete a medio escribir no divide entre cero', () => {
    expect(precioPorCredito('', '2000')).toBeNull()
    expect(precioPorCredito('30', '0')).toBeNull()
  })

  it('los decimales que hagan falta, sin rellenar con ceros', () => {
    expect(describirPrecioPorCredito('20', '2000')).toBe('S/ 0,01 por crédito')
    expect(describirPrecioPorCredito('100', '12000')).toBe('S/ 0,0083 por crédito')
  })

  it('el error de captura salta a la vista', () => {
    expect(describirPrecioPorCredito('30', '500')).toBe('S/ 0,06 por crédito')
  })
})

describe('ventana de la oferta', () => {
  it('el fin toma el día entero', () => {
    const inicio = diaAInstante('2026-05-10', 'inicio')!
    const fin = diaAInstante('2026-05-10', 'fin')!
    expect(new Date(fin).getTime() - new Date(inicio).getTime()).toBe(86399000)
  })

  it('ida y vuelta conserva el día', () => {
    expect(instanteADia(diaAInstante('2026-05-10', 'fin'))).toBe('2026-05-10')
  })

  it('sin fecha no hay ventana', () => {
    expect(diaAInstante('', 'inicio')).toBeNull()
    expect(instanteADia(null)).toBe('')
  })
})

describe('seOfreceAhora', () => {
  const oferta = (cambios: Partial<Parameters<typeof seOfreceAhora>[0]>) => ({
    is_active: true,
    available_from: null,
    available_until: null,
    ...cambios,
  })
  const hoy = new Date('2026-05-10T12:00:00Z')

  it('sin ventana se ofrece siempre', () => {
    expect(seOfreceAhora(oferta({}), hoy)).toBe(true)
  })

  it('fuera de la ventana no', () => {
    expect(seOfreceAhora(oferta({ available_from: '2026-05-11T00:00:00Z' }), hoy)).toBe(
      false,
    )
    expect(seOfreceAhora(oferta({ available_until: '2026-05-09T00:00:00Z' }), hoy)).toBe(
      false,
    )
  })

  it('apagarlo a mano manda sobre la ventana', () => {
    expect(
      seOfreceAhora(
        oferta({ is_active: false, available_until: '2026-12-31T00:00:00Z' }),
        hoy,
      ),
    ).toBe(false)
  })
})

describe('creditosPorPrecio', () => {
  it('sale del valor vigente del crédito', () => {
    expect(creditosPorPrecio('20', '0.0100')).toBe(2000)
    expect(creditosPorPrecio('50', '0.0100')).toBe(5000)
    expect(creditosPorPrecio('20', '0.0200')).toBe(1000)
  })

  it('a medio escribir no calcula nada', () => {
    expect(creditosPorPrecio('', '0.0100')).toBeNull()
    expect(creditosPorPrecio('20', null)).toBeNull()
    expect(creditosPorPrecio('20', '0')).toBeNull()
  })
})

describe('el regalo en porcentaje', () => {
  it('ida y vuelta', () => {
    expect(regaloEnPorcentaje('500', '5000')).toBe('10')
    expect(regaloEnPorcentaje('2000', '10000')).toBe('20')
    expect(regaloEnCreditos('10', '5000')).toBe('500')
    expect(regaloEnCreditos('20', '10000')).toBe('2000')
  })

  it('admite medios puntos', () => {
    expect(regaloEnPorcentaje('125', '5000')).toBe('2.5')
    expect(regaloEnCreditos('2.5', '5000')).toBe('125')
  })

  it('sin regalo o sin base, vacío', () => {
    expect(regaloEnPorcentaje('0', '5000')).toBe('')
    expect(regaloEnPorcentaje('500', '')).toBe('')
    expect(regaloEnCreditos('', '5000')).toBe('0')
  })
})

describe('formatearUnitario', () => {
  it('sin ceros de relleno, que se leen como otra cifra', () => {
    expect(formatearUnitario('0.0100')).toBe('S/ 0,01')
    expect(formatearUnitario('0.0200')).toBe('S/ 0,02')
  })

  it('conserva los decimales que llevan valor', () => {
    expect(formatearUnitario('0.0125')).toBe('S/ 0,0125')
    expect(formatearUnitario('0.0083')).toBe('S/ 0,0083')
  })
})
