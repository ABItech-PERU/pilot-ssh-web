import { describe, expect, it } from 'vitest'

import { getDesvioDelAlta, RUTA_DEL_ALTA } from '@/features/auth/alta'

describe('getDesvioDelAlta', () => {
  it('sin terminar, cualquier ruta privada lleva al alta', () => {
    for (const ruta of [
      '/app/servers',
      '/app',
      '/backoffice',
      '/app/servers/7/terminal',
    ]) {
      expect(getDesvioDelAlta(false, ruta)).toBe(RUTA_DEL_ALTA)
    }
  })

  it('sin terminar, en el alta se queda', () => {
    expect(getDesvioDelAlta(false, RUTA_DEL_ALTA)).toBeNull()
  })

  it('terminada, el alta vuelve al panel', () => {
    expect(getDesvioDelAlta(true, RUTA_DEL_ALTA)).toBe('/app/servers')
  })

  it('terminada, el panel se abre donde se pidió', () => {
    expect(getDesvioDelAlta(true, '/backoffice')).toBeNull()
  })
})
