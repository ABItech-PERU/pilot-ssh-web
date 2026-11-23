import { describe, expect, it } from 'vitest'

import {
  describeBorrado,
  fetchMigas,
  filtrarEntradas,
  joinRuta,
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

describe('describeBorrado', () => {
  it('nombra lo que se borra en el botón', () => {
    expect(describeBorrado('archivo').accion).toBe('Borrar archivo')
    expect(describeBorrado('carpeta').accion).toBe('Borrar carpeta')
    expect(describeBorrado('enlace').accion).toBe('Borrar enlace')
  })

  it('avisa que no hay papelera', () => {
    expect(describeBorrado('archivo').detalles.join(' ')).toContain('No hay papelera')
  })

  it('un enlace deja su destino como estaba', () => {
    expect(describeBorrado('enlace').detalles.join(' ')).toContain('destino')
  })
})
