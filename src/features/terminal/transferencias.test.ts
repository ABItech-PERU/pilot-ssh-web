import { describe, expect, it } from 'vitest'

import {
  calcularVelocidad,
  describirRestante,
  estimarRestante,
  planearSubida,
  suavizarVelocidad,
  resumirTransferencias,
  type Transferencia,
} from '@/features/terminal/transferencias'

const archivo = (nombre: string, bytes = 10) => new File([new Uint8Array(bytes)], nombre)

const transferencia = (cambios: Partial<Transferencia>): Transferencia => ({
  id: 1,
  archivo: archivo('a.txt'),
  nombre: 'a.txt',
  carpeta: '~',
  crearCarpeta: false,
  estado: 'en-cola',
  enviado: 0,
  total: 10,
  velocidad: null,
  ...cambios,
})

describe('calcularVelocidad', () => {
  it('mide los bytes por segundo de los últimos segundos', () => {
    const muestras = [
      { instante: 0, enviado: 0 },
      { instante: 1000, enviado: 4_000_000 },
      { instante: 2000, enviado: 8_000_000 },
    ]

    expect(calcularVelocidad(muestras)).toBe(4_000_000)
  })

  it('olvida lo que pasó hace más de tres segundos', () => {
    const muestras = [
      { instante: 0, enviado: 0 },
      { instante: 5000, enviado: 1_000_000 },
      { instante: 6000, enviado: 3_000_000 },
    ]

    expect(calcularVelocidad(muestras)).toBe(2_000_000)
  })

  it('con una sola muestra todavía no hay velocidad', () => {
    expect(calcularVelocidad([{ instante: 0, enviado: 0 }])).toBeNull()
  })
})

describe('suavizarVelocidad', () => {
  it('la primera medida se toma tal cual', () => {
    expect(suavizarVelocidad(null, 5_000_000, 1)).toBe(5_000_000)
  })

  it('un salto de la red mueve la velocidad mostrada solo un poco', () => {
    const mostrada = suavizarVelocidad(5_000_000, 6_000_000, 1)

    expect(mostrada).toBeGreaterThan(5_000_000)
    expect(mostrada).toBeLessThan(5_300_000)
  })

  it('si la red cambia de verdad, la alcanza en unos segundos', () => {
    let mostrada = 5_000_000
    for (let segundo = 0; segundo < 15; segundo++) {
      mostrada = suavizarVelocidad(mostrada, 2_000_000, 1)
    }

    expect(mostrada).toBeLessThan(2_200_000)
  })
})

describe('estimarRestante', () => {
  it('divide lo que falta entre la velocidad', () => {
    expect(estimarRestante(100, 40, 20)).toBe(3)
  })

  it('sin velocidad no promete un tiempo', () => {
    expect(estimarRestante(100, 40, null)).toBeNull()
  })
})

describe('describirRestante', () => {
  it('en segundos, minutos u horas, como un gestor de descargas', () => {
    expect(describirRestante(8.2)).toBe('quedan 9 s')
    expect(describirRestante(42.2)).toBe('quedan 45 s')
    expect(describirRestante(150)).toBe('quedan 3 min')
    expect(describirRestante(5400)).toBe('quedan 1,5 h')
  })
})

describe('planearSubida', () => {
  it('un archivo suelto va a la carpeta de destino', () => {
    const plan = planearSubida('/home/deploy', [
      { archivo: archivo('a.txt'), relativa: 'a.txt' },
    ])

    expect(plan).toEqual([
      expect.objectContaining({
        carpeta: '/home/deploy',
        nombre: 'a.txt',
        crearCarpeta: false,
      }),
    ])
  })

  it('una carpeta conserva su estructura y crea sus subcarpetas', () => {
    const plan = planearSubida('/home/deploy', [
      { archivo: archivo('index.html'), relativa: 'sitio/index.html' },
      { archivo: archivo('a.css'), relativa: 'sitio/css/a.css' },
    ])

    expect(
      plan.map(({ carpeta, nombre, crearCarpeta }) => ({
        carpeta,
        nombre,
        crearCarpeta,
      })),
    ).toEqual([
      { carpeta: '/home/deploy/sitio', nombre: 'sitio/index.html', crearCarpeta: true },
      {
        carpeta: '/home/deploy/sitio/css',
        nombre: 'sitio/css/a.css',
        crearCarpeta: true,
      },
    ])
  })
})

describe('resumirTransferencias', () => {
  it('cuenta lo hecho y suma el avance de todo lo que sube', () => {
    const lista = [
      transferencia({ id: 1, estado: 'lista', enviado: 10, total: 10 }),
      transferencia({ id: 2, estado: 'subiendo', enviado: 5, total: 10, velocidad: 2 }),
      transferencia({ id: 3, estado: 'en-cola', total: 20 }),
    ]

    expect(resumirTransferencias(lista)).toEqual({
      activas: 2,
      hechas: 1,
      fallidas: 0,
      total: 3,
      porcentaje: 38,
      velocidad: 2,
      restante: 12.5,
    })
  })

  it('sin nada pendiente, ni avance ni tiempo', () => {
    const lista = [
      transferencia({ estado: 'lista' }),
      transferencia({ id: 2, estado: 'error' }),
    ]

    expect(resumirTransferencias(lista)).toMatchObject({
      activas: 0,
      hechas: 1,
      fallidas: 1,
      restante: null,
    })
  })
})
