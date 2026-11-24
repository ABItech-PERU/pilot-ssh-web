import { describe, expect, it } from 'vitest'

import {
  aplicarFinDeLinea,
  describeBorrado,
  describeMedida,
  describePermisos,
  esComprimido,
  esModoValido,
  fetchCuadricula,
  fetchFinDeLinea,
  fetchMigas,
  fetchOctal,
  fetchOctalDeCuadricula,
  filtrarEntradas,
  joinRuta,
  ordenarEntradas,
  pideEscribirElNombre,
  quitarOcultos,
} from '@/features/terminal/archivos'
import type { EntradaDeArchivo } from '@/features/terminal/socket'

describe('fetchMigas', () => {
  it('cada tramo lleva a su carpeta', () => {
    expect(fetchMigas('/home/deploy/sitio')).toEqual([
      { nombre: 'home', ruta: '/home' },
      { nombre: 'deploy', ruta: '/home/deploy' },
      { nombre: 'sitio', ruta: '/home/deploy/sitio' },
    ])
  })

  it('la raíz no tiene migas', () => {
    expect(fetchMigas('/')).toEqual([])
  })
})

describe('joinRuta', () => {
  it('cuelga el nombre de la carpeta', () => {
    expect(joinRuta('/home/deploy', 'notas.txt')).toBe('/home/deploy/notas.txt')
  })

  it('en la raíz no duplica la barra', () => {
    expect(joinRuta('/', 'etc')).toBe('/etc')
  })
})

const entrada = (nombre: string, tipo: EntradaDeArchivo['tipo'] = 'archivo') => ({
  nombre,
  tipo,
  tamano: 0,
  modificado: null,
  permisos: 'rw-r--r--',
})

describe('filtrarEntradas', () => {
  const entradas = [entrada('Proyectos', 'carpeta'), entrada('notas.txt'), entrada('app.log')]

  it('sin texto deja todo', () => {
    expect(filtrarEntradas(entradas, '  ')).toEqual(entradas)
  })

  it('busca en el nombre sin mirar mayúsculas', () => {
    expect(filtrarEntradas(entradas, 'PROY').map((e) => e.nombre)).toEqual(['Proyectos'])
  })

  it('no distingue tildes', () => {
    expect(filtrarEntradas([entrada('canción.mp3')], 'cancion')).toHaveLength(1)
  })
})

describe('esComprimido', () => {
  it('reconoce lo que se puede extraer', () => {
    for (const nombre of ['sitio.tar.gz', 'a.TGZ', 'b.tar', 'c.tar.bz2', 'd.tar.xz', 'fotos.zip']) {
      expect(esComprimido(nombre)).toBe(true)
    }
  })

  it('lo demás no se ofrece para extraer', () => {
    for (const nombre of ['notas.txt', 'app.gz', '.tar.gz', 'zip']) {
      expect(esComprimido(nombre)).toBe(false)
    }
  })
})

describe('describeMedida', () => {
  it('cuenta archivos, carpetas y tamaño en palabras', () => {
    expect(describeMedida({ archivos: 1566, carpetas: 12, kb: 455_000 })).toBe(
      '1566 archivos, 12 carpetas y 444,3 MB',
    )
  })

  it('en singular cuando hay uno', () => {
    expect(describeMedida({ archivos: 1, carpetas: 1, kb: 4 })).toBe(
      '1 archivo, 1 carpeta y 4 KB',
    )
  })

  it('una carpeta vacía lo dice así', () => {
    expect(describeMedida({ archivos: 0, carpetas: 0, kb: 4 })).toBe('Está vacía')
  })
})

describe('pideEscribirElNombre', () => {
  it('con más de 100 archivos hay que escribir el nombre', () => {
    expect(pideEscribirElNombre({ archivos: 101, carpetas: 0, kb: 1 })).toBe(true)
    expect(pideEscribirElNombre({ archivos: 100, carpetas: 0, kb: 1 })).toBe(false)
  })

  it('si no se pudo medir, también', () => {
    expect(pideEscribirElNombre(null)).toBe(true)
  })
})

describe('describeBorrado', () => {
  it('nombra lo que se borra en el botón', () => {
    expect(describeBorrado('archivo').accion).toBe('Borrar archivo')
    expect(describeBorrado('carpeta').accion).toBe('Borrar carpeta y su contenido')
    expect(describeBorrado('enlace').accion).toBe('Borrar enlace')
  })

  it('avisa que no hay papelera', () => {
    expect(describeBorrado('archivo').detalles.join(' ')).toContain('No hay papelera')
  })

  it('un enlace deja su destino como estaba', () => {
    expect(describeBorrado('enlace').detalles.join(' ')).toContain('destino')
  })
})

describe('ordenarEntradas', () => {
  const lista = [
    { ...entrada('b.txt'), tamano: 50, modificado: '2026-01-02T00:00:00Z' },
    { ...entrada('zeta', 'carpeta'), tamano: 4096, modificado: '2026-01-01T00:00:00Z' },
    { ...entrada('A.log'), tamano: 900, modificado: '2026-01-03T00:00:00Z' },
    { ...entrada('alfa', 'carpeta'), tamano: 4096, modificado: '2026-01-04T00:00:00Z' },
  ]

  it('por nombre, carpetas primero y sin mirar mayúsculas', () => {
    expect(ordenarEntradas(lista, 'nombre', 'asc').map((e) => e.nombre)).toEqual([
      'alfa',
      'zeta',
      'A.log',
      'b.txt',
    ])
  })

  it('por tamaño, de mayor a menor, sin sacar las carpetas de arriba', () => {
    expect(ordenarEntradas(lista, 'tamano', 'desc').map((e) => e.nombre)).toEqual([
      'alfa',
      'zeta',
      'A.log',
      'b.txt',
    ])
  })

  it('por fecha, lo más reciente primero', () => {
    expect(ordenarEntradas(lista, 'fecha', 'desc').map((e) => e.nombre)).toEqual([
      'alfa',
      'zeta',
      'A.log',
      'b.txt',
    ])
  })

  it('no cambia la lista que recibe', () => {
    const copia = [...lista]
    ordenarEntradas(lista, 'tamano', 'asc')
    expect(lista).toEqual(copia)
  })
})

describe('quitarOcultos', () => {
  it('quita lo que empieza con punto', () => {
    const lista = [entrada('.env'), entrada('index.php'), entrada('.git', 'carpeta')]
    expect(quitarOcultos(lista).map((e) => e.nombre)).toEqual(['index.php'])
  })
})

describe('permisos', () => {
  it('lee el número de una cadena de permisos', () => {
    expect(fetchOctal('rw-r--r--')).toBe('644')
    expect(fetchOctal('rwxr-x---')).toBe('750')
  })

  it('los bits especiales cuentan su ejecutar y nada más', () => {
    expect(fetchOctal('rwxr-sr-x')).toBe('755')
    expect(fetchOctal('rwxr-xr-T')).toBe('754')
  })

  it('pasa del número a la cuadrícula y vuelve', () => {
    const cuadricula = fetchCuadricula('640')
    expect(cuadricula.propietario).toEqual({ leer: true, escribir: true, ejecutar: false })
    expect(cuadricula.grupo).toEqual({ leer: true, escribir: false, ejecutar: false })
    expect(cuadricula.otros).toEqual({ leer: false, escribir: false, ejecutar: false })
    expect(fetchOctalDeCuadricula(cuadricula)).toBe('640')
  })

  it('reconoce un número válido', () => {
    expect(esModoValido('755')).toBe(true)
    expect(esModoValido('7777')).toBe(false)
    expect(esModoValido('89a')).toBe(false)
  })

  it('escribe el número como se lee en ls', () => {
    expect(describePermisos('755')).toBe('rwxr-xr-x')
  })
})

describe('fin de línea', () => {
  it('reconoce un archivo de Windows', () => {
    expect(fetchFinDeLinea('a\r\nb\r\n')).toBe('\r\n')
    expect(fetchFinDeLinea('a\nb\n')).toBe('\n')
  })

  it('devuelve los finales de Windows que el editor del navegador quita', () => {
    expect(aplicarFinDeLinea('a\nb\n', '\r\n')).toBe('a\r\nb\r\n')
    expect(aplicarFinDeLinea('a\nb\n', '\n')).toBe('a\nb\n')
  })
})
