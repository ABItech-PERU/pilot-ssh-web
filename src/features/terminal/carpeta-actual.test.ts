import { describe, expect, it } from 'vitest'

import { leerDelPrompt, leerOsc7 } from '@/features/terminal/carpeta-actual'

describe('leerOsc7', () => {
  it('toma la ruta que anuncia el shell', () => {
    expect(leerOsc7('file://maquina/home/demo/proyectos')).toBe('/home/demo/proyectos')
  })

  it('entiende los espacios escapados', () => {
    expect(leerOsc7('file://maquina/home/demo/mis%20cosas')).toBe('/home/demo/mis cosas')
  })

  it('ignora lo que no es una carpeta', () => {
    expect(leerOsc7('0;titulo de la ventana')).toBeNull()
  })
})

describe('leerDelPrompt', () => {
  it('lee la ruta del prompt de siempre', () => {
    expect(leerDelPrompt('demo@maquina:/var/www$ ')).toBe('/var/www')
  })

  it('la carpeta de inicio vale tal cual: el servidor la resuelve', () => {
    expect(leerDelPrompt('30ede0529031:~$ ')).toBe('~')
  })

  it('con un comando a medias no se fía', () => {
    expect(leerDelPrompt('demo@maquina:~$ cd /etc')).toBeNull()
  })

  it('sin ruta en el prompt, no adivina', () => {
    expect(leerDelPrompt('[demo@maquina proyectos]$ ')).toBeNull()
  })

  it('el prompt de root también', () => {
    expect(leerDelPrompt('root@maquina:/opt/app# ')).toBe('/opt/app')
  })
})
