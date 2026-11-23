import { describe, expect, it } from 'vitest'

import { guardarVista, leerVista, VISTA_INICIAL } from '@/features/terminal/vista-de-archivos'

describe('vista de archivos', () => {
  it('sin nada guardado, ordena por nombre y enseña los ocultos', () => {
    expect(leerVista()).toEqual(VISTA_INICIAL)
  })

  it('recuerda lo que eligió la persona', () => {
    guardarVista({ orden: 'fecha', sentido: 'desc', ocultos: false })

    expect(leerVista()).toEqual({ orden: 'fecha', sentido: 'desc', ocultos: false })
  })

  it('un valor guardado roto vuelve a lo inicial', () => {
    window.localStorage.setItem('pilotssh.archivos.vista', '{no es json')

    expect(leerVista()).toEqual(VISTA_INICIAL)
  })

  it('un criterio desconocido no rompe el orden', () => {
    window.localStorage.setItem('pilotssh.archivos.vista', '{"orden":"color"}')

    expect(leerVista().orden).toBe('nombre')
  })
})
