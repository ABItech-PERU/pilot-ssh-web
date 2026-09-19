import { describe, expect, it } from 'vitest'

import { describirNivel, NIVELES } from '@/features/access/levels'

describe('describirNivel', () => {
  it('sobre el servidor entero dice lo de siempre', () => {
    expect(describirNivel('connect', null)).toBe(NIVELES.connect.alcance)
  })

  it('sobre una credencial la nombra, en singular', () => {
    expect(describirNivel('connect', 'uat-sunmetals')).toBe(
      'Abre terminales con uat-sunmetals.',
    )
  })

  it('no promete editar con una sola credencial', () => {
    expect(describirNivel('manage', 'uat-sunmetals')).toContain(
      'editar pide el servidor entero',
    )
  })
})
