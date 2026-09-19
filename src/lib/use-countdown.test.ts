import { describe, expect, it } from 'vitest'

import { formatCountdown } from '@/lib/use-countdown'

describe('formatCountdown', () => {
  it('bajo el minuto cuenta en segundos', () => {
    expect(formatCountdown(45)).toBe('45s')
  })

  it('pasado el minuto usa mm:ss', () => {
    expect(formatCountdown(90)).toBe('1:30')
  })

  it('rellena los segundos con cero para que no salte el ancho', () => {
    expect(formatCountdown(305)).toBe('5:05')
  })

  it('una espera larga se lee entera, sin recortar a horas', () => {
    expect(formatCountdown(51 * 60)).toBe('51:00')
  })

  it('cero no deja el boton con un contador colgado', () => {
    expect(formatCountdown(0)).toBe('0s')
  })
})
