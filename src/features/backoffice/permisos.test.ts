import { describe, expect, it } from 'vitest'

import {
  describirPermisos,
  esPersonal,
  faltanDosPasos,
  llevaFinanzas,
  primeraSeccion,
} from '@/features/backoffice/permisos'

const cuenta = (permisos: Partial<Record<string, boolean>> = {}, dosPasos = true) => ({
  can_attend_customers: false,
  can_manage_finances: false,
  can_manage_staff: false,
  two_factor_enabled: dosPasos,
  ...permisos,
})

describe('esPersonal', () => {
  it('cualquier permiso lo hace del personal, y ninguno es un cliente', () => {
    expect(esPersonal(cuenta({ can_attend_customers: true }))).toBe(true)
    expect(esPersonal(cuenta({ can_manage_staff: true }))).toBe(true)
    expect(esPersonal(cuenta())).toBe(false)
  })

  it('sin sesión no hay personal', () => {
    expect(esPersonal(null)).toBe(false)
    expect(esPersonal(undefined)).toBe(false)
  })
})

describe('faltanDosPasos', () => {
  it('solo le faltan a quien es del personal y no los tiene', () => {
    expect(faltanDosPasos(cuenta({ can_manage_finances: true }, false))).toBe(true)
    expect(faltanDosPasos(cuenta({ can_manage_finances: true }))).toBe(false)
    expect(faltanDosPasos(cuenta({}, false))).toBe(false)
  })
})

describe('describirPermisos', () => {
  it('los nombra como el servidor', () => {
    expect(describirPermisos(cuenta())).toBe('Sin permisos')
    expect(describirPermisos(cuenta({ can_manage_finances: true }))).toBe('Finanzas')
    expect(
      describirPermisos(
        cuenta({ can_attend_customers: true, can_manage_finances: true }),
      ),
    ).toBe('Atención y Finanzas')
    expect(
      describirPermisos(
        cuenta({
          can_attend_customers: true,
          can_manage_finances: true,
          can_manage_staff: true,
        }),
      ),
    ).toBe('Atención, Finanzas y Personal')
  })
})

describe('primeraSeccion', () => {
  it('finanzas empieza en el resumen; quien atiende, en las organizaciones', () => {
    expect(primeraSeccion(cuenta({ can_manage_finances: true }))).toBeNull()
    expect(primeraSeccion(cuenta({ can_attend_customers: true }))).toBe('organizations')
    expect(primeraSeccion(cuenta({ can_manage_staff: true }))).toBe('staff')
  })

  it('quien lleva finanzas mueve dinero aunque tenga más permisos', () => {
    expect(
      llevaFinanzas(cuenta({ can_attend_customers: true, can_manage_finances: true })),
    ).toBe(true)
  })
})
