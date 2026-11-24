import { describe, expect, it } from 'vitest'

import {
  ANCHO_INICIAL,
  ANCHO_MINIMO,
  fetchAnchoMaximo,
  guardarAncho,
  leerAncho,
  limitarAncho,
} from '@/features/terminal/panel-lateral'

describe('limitarAncho', () => {
  it('deja a la terminal al menos el 40 % del espacio', () => {
    expect(fetchAnchoMaximo(1000)).toBe(600)
    expect(limitarAncho(900, 1000)).toBe(600)
  })

  it('no baja del mínimo aunque se arrastre más', () => {
    expect(limitarAncho(120, 1400)).toBe(ANCHO_MINIMO)
  })

  it('respeta el mínimo en una pantalla estrecha', () => {
    expect(fetchAnchoMaximo(400)).toBe(ANCHO_MINIMO)
  })

  it('redondea a píxeles enteros', () => {
    expect(limitarAncho(420.6, 1400)).toBe(421)
  })
})

describe('leerAncho', () => {
  it('empieza en el inicial si no hay nada guardado', () => {
    expect(leerAncho()).toBe(ANCHO_INICIAL)
  })

  it('recuerda el último ancho', () => {
    guardarAncho(520)
    expect(leerAncho()).toBe(520)
  })

  it('ignora un valor guardado que no sirve', () => {
    window.localStorage.setItem('pilotssh.panel-lateral.ancho', 'ancho')
    expect(leerAncho()).toBe(ANCHO_INICIAL)
  })
})
