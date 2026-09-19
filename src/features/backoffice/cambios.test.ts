import { describe, expect, it } from 'vitest'

import {
  camposDelCambio,
  listarCampos,
  partirTitulo,
  retratoDelCambio,
  tituloDelCambio,
} from '@/features/backoffice/cambios'
import type { AuditEntry } from '@/types/api'

const entrada = (cambios: Partial<AuditEntry>): AuditEntry =>
  ({
    id: 'c1',
    action: 'credits.package_updated',
    description: 'Cambió Recarga S/ 30',
    metadata: {},
    ...cambios,
  }) as AuditEntry

describe('tituloDelCambio', () => {
  it('se queda con lo de antes de los dos puntos', () => {
    expect(
      tituloDelCambio(
        entrada({ description: 'Cambió Recarga S/ 30: precio de S/ 20 a S/ 30' }),
      ),
    ).toBe('Cambió Recarga S/ 30')
  })

  it('una frase sin lista se queda entera', () => {
    expect(tituloDelCambio(entrada({ description: 'Puso el crédito a S/ 0,02' }))).toBe(
      'Puso el crédito a S/ 0,02',
    )
  })
})

describe('listarCampos', () => {
  const con = (labels: string[]) =>
    entrada({
      metadata: { fields: labels.map((label) => ({ label, before: 'a', after: 'b' })) },
    })

  it('los enumera en castellano', () => {
    expect(listarCampos(con(['Nombre', 'Precio', 'Créditos']))).toBe(
      'Nombre, precio y créditos',
    )
    expect(listarCampos(con(['Precio', 'Créditos']))).toBe('Precio y créditos')
    expect(listarCampos(con(['Precio']))).toBe('Precio')
  })

  it('un registro de antes del desglose no inventa nada', () => {
    expect(listarCampos(entrada({}))).toBe('')
    expect(camposDelCambio(entrada({}))).toEqual([])
  })

  it('descarta lo que no tenga forma de campo', () => {
    expect(camposDelCambio(entrada({ metadata: { fields: ['roto', null] } }))).toEqual([])
  })
})

describe('retratoDelCambio', () => {
  it('lo que era el paquete, para cuando ya no se pueda mirar', () => {
    const borrado = entrada({
      action: 'credits.package_deleted',
      metadata: { snapshot: [{ label: 'Precio', value: 'S/ 25' }] },
    })
    expect(retratoDelCambio(borrado)).toEqual([{ label: 'Precio', value: 'S/ 25' }])
  })

  it('un cambio corriente no trae retrato', () => {
    expect(retratoDelCambio(entrada({}))).toEqual([])
  })
})

describe('partirTitulo', () => {
  it('separa lo que se hizo del nombre, para poder destacarlo', () => {
    expect(
      partirTitulo(
        entrada({
          description: 'Creó el paquete Regalo Navidad',
          metadata: { package: 'Regalo Navidad' },
        }),
      ),
    ).toEqual({ accion: 'Creó el paquete', nombre: 'Regalo Navidad' })
  })

  it('un cambio sin paquete no se parte', () => {
    expect(partirTitulo(entrada({ description: 'Puso el crédito a S/ 0,02' }))).toEqual({
      accion: 'Puso el crédito a S/ 0,02',
      nombre: '',
    })
  })

  it('si el nombre no cierra la frase, se deja entera', () => {
    expect(
      partirTitulo(
        entrada({ description: 'Cambió la tarifa', metadata: { package: 'Otro' } }),
      ),
    ).toEqual({ accion: 'Cambió la tarifa', nombre: '' })
  })
})
