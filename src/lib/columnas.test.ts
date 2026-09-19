import { describe, expect, it } from 'vitest'

import {
  alternarColumna,
  columnasPorDefecto,
  MAXIMO_DE_COLUMNAS,
  sanear,
  type MetaDeColumna,
} from '@/lib/columnas'

const CATALOGO: MetaDeColumna[] = [
  { key: 'n', header: 'N°', fija: true },
  { key: 'nombre', header: 'Nombre', fija: true },
  { key: 'fecha', header: 'Fecha', prioridad: 3 },
  { key: 'paquete', header: 'Paquete', prioridad: 4 },
  { key: 'cobro', header: 'Cobro', prioridad: 2 },
  { key: 'importe', header: 'Importe', prioridad: 1 },
  { key: 'creditos', header: 'Créditos', prioridad: 6 },
  { key: 'estado', header: 'Estado', prioridad: 1 },
  { key: 'acciones', header: '', fija: true },
  { key: 'medio', header: 'Medio', porDefecto: false, prioridad: 5 },
  { key: 'referencia', header: 'Referencia', porDefecto: false, prioridad: 9 },
]

describe('columnasPorDefecto', () => {
  it('las fijas y las que no se esconden, en el orden del catálogo', () => {
    expect(columnasPorDefecto(CATALOGO)).toEqual([
      'n', 'nombre', 'fecha', 'paquete', 'cobro', 'importe', 'creditos', 'estado', 'acciones',
    ])
    expect(columnasPorDefecto(CATALOGO)).toHaveLength(MAXIMO_DE_COLUMNAS)
  })
})

describe('alternarColumna', () => {
  const visibles = columnasPorDefecto(CATALOGO)

  it('quita una que estaba y no esconde nada más', () => {
    expect(alternarColumna(visibles, 'creditos', CATALOGO)).toEqual({
      visibles: visibles.filter((cada) => cada !== 'creditos'),
      ocultada: null,
    })
  })

  it('al pasarse del tope esconde la de menos prioridad, y la nueva entra en su sitio', () => {
    const resultado = alternarColumna(visibles, 'medio', CATALOGO)

    expect(resultado.ocultada).toBe('creditos')
    expect(resultado.visibles).toEqual([
      'n', 'nombre', 'fecha', 'paquete', 'cobro', 'importe', 'estado', 'acciones', 'medio',
    ])
  })

  it('con sitio de sobra solo añade', () => {
    const conHueco = visibles.filter((cada) => cada !== 'creditos')

    expect(alternarColumna(conHueco, 'referencia', CATALOGO).ocultada).toBeNull()
  })

  it('una fija no se toca, ni una que no existe', () => {
    expect(alternarColumna(visibles, 'nombre', CATALOGO).visibles).toBe(visibles)
    expect(alternarColumna(visibles, 'inventada', CATALOGO).visibles).toBe(visibles)
  })
})

describe('sanear', () => {
  it('descarta lo que no es una lista de columnas conocidas', () => {
    expect(sanear('tabla', CATALOGO)).toBeNull()
    expect(sanear(['vieja', 3], CATALOGO)).toBeNull()
  })

  it('mete las fijas aunque falten y respeta el orden del catálogo', () => {
    expect(sanear(['estado', 'fecha', 'vieja'], CATALOGO)).toEqual([
      'n', 'nombre', 'fecha', 'estado', 'acciones',
    ])
  })
})
