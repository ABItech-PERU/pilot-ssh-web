import { describe, expect, it } from 'vitest'

import {
  buildPestana,
  fetchActivaTrasCerrar,
  fetchOrdinales,
  type Pestana,
} from '@/features/terminal/pestanas'

const conCredenciales = (...credenciales: string[]): Pestana[] =>
  credenciales.map((credentialId, posicion) => ({
    id: `p${posicion + 1}`,
    credentialId,
  }))

describe('buildPestana', () => {
  it('cada shell nace con su propia identidad', () => {
    expect(buildPestana('root').id).not.toBe(buildPestana('root').id)
  })
})

describe('fetchActivaTrasCerrar', () => {
  const pestanas = conCredenciales('root', 'deploy', 'ana')
  const [primera, segunda, tercera] = pestanas as [Pestana, Pestana, Pestana]

  it('pasa el turno a la vecina de la derecha', () => {
    expect(fetchActivaTrasCerrar(pestanas, segunda, segunda)).toBe(tercera)
  })

  it('cerrando la última, a la de la izquierda', () => {
    expect(fetchActivaTrasCerrar(pestanas, tercera, tercera)).toBe(segunda)
  })

  it('cerrar una de atrás no mueve el turno', () => {
    expect(fetchActivaTrasCerrar(pestanas, primera, tercera)).toBe(tercera)
  })
})

describe('fetchOrdinales', () => {
  it('numera las repetidas y deja sola a la única', () => {
    const pestanas = conCredenciales('root', 'deploy', 'root')

    expect(fetchOrdinales(pestanas)).toEqual({ p1: 1, p2: 0, p3: 2 })
  })
})
