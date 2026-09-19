import { describe, expect, it } from 'vitest'

import {
  formatearTelefono,
  partirTelefono,
  telefonoValido,
  unirTelefono,
} from '@/lib/telefonos'

describe('partirTelefono', () => {
  it('separa el prefijo del número', () => {
    expect(partirTelefono('+51987654321')).toEqual({
      prefijo: '+51',
      numero: '987654321',
    })
  })

  it('gana el prefijo largo: +1 y +51 empiezan igual', () => {
    expect(partirTelefono('+13055551234').prefijo).toBe('+1')
    expect(partirTelefono('+51987654321').prefijo).toBe('+51')
    expect(partirTelefono('+591712345678').prefijo).toBe('+591')
  })

  it('limpia lo que se escribe a mano', () => {
    expect(partirTelefono('+51 (987) 654-321').numero).toBe('987654321')
  })

  it('sin prefijo conocido, Perú por defecto y el número entero', () => {
    expect(partirTelefono('987654321')).toEqual({ prefijo: '+51', numero: '987654321' })
    expect(partirTelefono('')).toEqual({ prefijo: '+51', numero: '' })
  })
})

describe('unirTelefono', () => {
  it('junta prefijo y dígitos', () => {
    expect(unirTelefono('+51', '987 654 321')).toBe('+51987654321')
  })

  it('sin número no deja un prefijo suelto', () => {
    expect(unirTelefono('+51', '')).toBe('')
  })
})

describe('telefonoValido', () => {
  it('exige prefijo y entre ocho y quince dígitos', () => {
    expect(telefonoValido('+51987654321')).toBe(true)
    expect(telefonoValido('987654321')).toBe(false)
    expect(telefonoValido('+51987')).toBe(false)
    expect(telefonoValido('+5198765432101234')).toBe(false)
  })
})

describe('formatearTelefono', () => {
  it('se lee de tres en tres', () => {
    expect(formatearTelefono('+51987654321')).toBe('+51 987 654 321')
  })

  it('sin número, nada', () => {
    expect(formatearTelefono('')).toBe('')
  })
})
