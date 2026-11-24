import { describe, expect, it } from 'vitest'

import { leerElegidos, leerSoltados } from '@/features/terminal/soltar'

const archivo = (nombre: string) => new File(['x'], nombre)

/** Como las entradas de FileSystem del navegador, que jsdom no trae. */
function entradaDeArchivo(nombre: string) {
  return {
    isFile: true,
    isDirectory: false,
    name: nombre,
    file: (listo: (f: File) => void) => listo(archivo(nombre)),
  }
}

function entradaDeCarpeta(nombre: string, hijos: unknown[]) {
  return {
    isFile: false,
    isDirectory: true,
    name: nombre,
    createReader: () => {
      let leido = false
      // Como Chrome, entrega los hijos en tandas hasta una vacía
      return {
        readEntries: (listo: (entradas: unknown[]) => void) => {
          listo(leido ? [] : hijos)
          leido = true
        },
      }
    },
  }
}

function soltado(entradas: unknown[]): DataTransfer {
  return {
    items: entradas.map((entrada) => ({ kind: 'file', webkitGetAsEntry: () => entrada })),
    files: [],
  } as unknown as DataTransfer
}

describe('leerSoltados', () => {
  it('una carpeta soltada llega archivo por archivo con su ruta dentro', async () => {
    const datos = soltado([
      entradaDeCarpeta('sitio', [
        entradaDeArchivo('index.html'),
        entradaDeCarpeta('css', [entradaDeArchivo('a.css')]),
      ]),
      entradaDeArchivo('notas.txt'),
    ])

    const leidos = await leerSoltados(datos)

    expect(leidos.map((uno) => uno.relativa)).toEqual([
      'sitio/index.html',
      'sitio/css/a.css',
      'notas.txt',
    ])
  })

  it('sin entradas, usa los archivos tal cual', async () => {
    const datos = { items: [], files: [archivo('a.txt')] } as unknown as DataTransfer

    const leidos = await leerSoltados(datos)

    expect(leidos.map((uno) => uno.relativa)).toEqual(['a.txt'])
  })
})

describe('leerElegidos', () => {
  it('lo elegido como carpeta trae su ruta relativa', () => {
    const elegido = archivo('a.css')
    Object.defineProperty(elegido, 'webkitRelativePath', { value: 'sitio/css/a.css' })

    expect(leerElegidos([elegido, archivo('b.txt')]).map((uno) => uno.relativa)).toEqual([
      'sitio/css/a.css',
      'b.txt',
    ])
  })
})
