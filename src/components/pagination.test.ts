import { describe, expect, it } from 'vitest'

import { buildPageWindow } from '@/components/pagination'

describe('buildPageWindow', () => {
  it('con pocas paginas las muestra todas, sin elipsis', () => {
    expect(buildPageWindow(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('en el medio deja los dos extremos fijos y elipsis a los lados', () => {
    expect(buildPageWindow(50, 100)).toEqual([1, 'gap', 48, 49, 50, 51, 52, 'gap', 100])
  })

  it('al principio rellena hacia delante en vez de dejar hueco', () => {
    expect(buildPageWindow(1, 100)).toEqual([1, 2, 3, 4, 5, 6, 'gap', 100])
  })

  it('al final rellena hacia atras', () => {
    expect(buildPageWindow(100, 100)).toEqual([1, 'gap', 95, 96, 97, 98, 99, 100])
  })

  it('nunca pinta una elipsis que esconda una sola pagina', () => {
    const ventana = buildPageWindow(4, 20)
    const posicion = ventana.indexOf('gap')

    // Un `…` que tapa solo el 2 ocuparia mas que el propio numero
    expect(posicion).toBeGreaterThan(-1)
    expect(ventana[posicion - 1]).not.toBe(1)
  })

  it('una sola pagina se resuelve fuera: aqui devuelve solo esa', () => {
    expect(buildPageWindow(1, 1)).toEqual([1])
  })
})
