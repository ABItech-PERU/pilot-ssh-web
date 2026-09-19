import { describe, expect, it } from 'vitest'

import {
  buildLabelColors,
  buildLabelOptions,
  describirUso,
} from '@/features/servers/labels'
import type { LabelDefinition } from '@/types/api'

function definicion(extra: Partial<LabelDefinition> = {}): LabelDefinition {
  return {
    id: 'l1',
    organization: 'o1',
    key: 'Entorno',
    values: ['Producción', 'Pruebas'],
    colors: { Producción: 'red', Pruebas: 'amber' },
    usage: { grants: 0, values: {} },
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  }
}

describe('buildLabelColors', () => {
  it('indexa por pareja, que es como la etiqueta viaja puesta', () => {
    const colores = buildLabelColors([definicion()])

    expect(colores).toEqual({
      'Entorno:Producción': 'red',
      'Entorno:Pruebas': 'amber',
    })
  })

  it('la opción sin color no se queda sin pintar', () => {
    const colores = buildLabelColors([definicion({ colors: {} })])

    expect(colores['Entorno:Producción']).toBe('slate')
  })
})

describe('buildLabelOptions', () => {
  it('abre con «todas», que es como se quita el filtro', () => {
    const opciones = buildLabelOptions({})

    expect(opciones).toEqual([{ valor: 'todas', etiqueta: 'Todas las etiquetas' }])
  })

  it('saca una fila por pareja, no una por nombre', () => {
    const opciones = buildLabelOptions({ Entorno: ['Producción', 'Pruebas'] })

    expect(opciones.slice(1)).toEqual([
      { valor: 'Entorno:Producción', etiqueta: 'Entorno: Producción' },
      { valor: 'Entorno:Pruebas', etiqueta: 'Entorno: Pruebas' },
    ])
  })
})

describe('describirUso', () => {
  it('enumera solo lo que tiene asignado', () => {
    expect(describirUso({ servers: 2, credentials: 1 })).toBe(
      '2 servidores y 1 credencial',
    )
    expect(describirUso({ servers: 0, credentials: 3 })).toBe('3 credenciales')
  })

  it('la opción que no lleva nada lo dice, no enseña un cero', () => {
    expect(describirUso(undefined)).toBe('Sin asignar')
    expect(describirUso({ servers: 0, credentials: 0 })).toBe('Sin asignar')
  })
})
