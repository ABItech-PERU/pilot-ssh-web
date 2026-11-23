import { describe, expect, it } from 'vitest'

import { crearDescarga, fetchPorcentajeDeDescarga } from '@/features/terminal/descarga'

const tramo = (texto: string) => new TextEncoder().encode(texto).buffer

describe('crearDescarga', () => {
  it('junta los tramos en el orden en que llegan', async () => {
    const descarga = crearDescarga({ nombre: 'notas.txt', tamano: 10, ruta: '/x/notas.txt' })

    descarga.sumar(tramo('hola '))
    descarga.sumar(tramo('mundo'))

    const archivo = descarga.armar()
    expect(await archivo.text()).toBe('hola mundo')
  })

  it('cuenta lo recibido para la barra de avance', () => {
    const descarga = crearDescarga({ nombre: 'a.bin', tamano: 8, ruta: '/a.bin' })

    descarga.sumar(tramo('abcd'))

    expect(descarga.avance()).toEqual({ nombre: 'a.bin', recibido: 4, total: 8 })
  })
})

describe('fetchPorcentajeDeDescarga', () => {
  it('redondea y no pasa de 100', () => {
    expect(fetchPorcentajeDeDescarga({ nombre: 'a', recibido: 1, total: 3 })).toBe(33)
    expect(fetchPorcentajeDeDescarga({ nombre: 'a', recibido: 9, total: 8 })).toBe(100)
  })

  it('un archivo vacío no divide por cero', () => {
    expect(fetchPorcentajeDeDescarga({ nombre: 'a', recibido: 0, total: 0 })).toBe(100)
  })
})
