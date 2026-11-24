import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DialogoDeDetalles } from '@/features/terminal/DialogoDeDetalles'
import type { EntradaDeArchivo, MensajeDeTarea } from '@/features/terminal/socket'

const NOTAS: EntradaDeArchivo & { ruta: string } = {
  nombre: 'notas.txt',
  ruta: '/home/deploy/notas.txt',
  tipo: 'archivo',
  tamano: 2_500_000,
  modificado: '2026-11-20T10:00:00Z',
  permisos: 'rw-r-----',
  propietario: 'deploy',
  grupo: 'www-data',
}

function montar(entrada: EntradaDeArchivo & { ruta: string } = NOTAS) {
  const props = {
    medir: vi.fn(async (ruta: string): Promise<MensajeDeTarea> => ({
      type: 'tarea',
      accion: 'medir',
      pedida: ruta,
      estado: 'hecho',
      archivos: 12,
      carpetas: 3,
      kb: 2048,
    })),
    onCopiarRuta: vi.fn(),
    onCerrar: vi.fn(),
  }
  render(<DialogoDeDetalles entrada={entrada} {...props} />)
  return props
}

/** El valor de una fila de la lista de detalles, por su etiqueta. */
const valorDe = (etiqueta: string) =>
  screen.getByText(etiqueta, { selector: 'dt' }).nextElementSibling as HTMLElement

describe('DialogoDeDetalles', () => {
  it('muestra lo que se sabe del archivo, con el tamaño exacto', () => {
    montar()

    expect(screen.getByRole('dialog', { name: 'notas.txt' })).toBeVisible()
    expect(valorDe('Ubicación')).toHaveTextContent('/home/deploy')
    expect(valorDe('Tamaño')).toHaveTextContent('2,4 MB')
    expect(valorDe('Tamaño')).toHaveTextContent('2.500.000 bytes')
    expect(valorDe('Propietario')).toHaveTextContent('deploy')
    expect(valorDe('Grupo')).toHaveTextContent('www-data')
    expect(valorDe('Permisos')).toHaveTextContent('rw-r-----')
    expect(valorDe('Permisos')).toHaveTextContent('640')
  })

  it('explica los permisos en palabras', () => {
    montar()

    const permisos = within(valorDe('Permisos'))
    expect(permisos.getByText('Leer y escribir')).toBeVisible()
    expect(permisos.getByText('Nada')).toBeVisible()
  })

  it('mide una carpeta solo si se pide', async () => {
    const usuario = userEvent.setup()
    const { medir } = montar({
      ...NOTAS,
      nombre: 'sitio',
      ruta: '/home/deploy/sitio',
      tipo: 'carpeta',
    })

    expect(medir).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Calcular' }))

    expect(medir).toHaveBeenCalledWith('/home/deploy/sitio')
    expect(await screen.findByText('12 archivos, 3 carpetas y 2 MB')).toBeVisible()
  })

  it('dice a dónde apunta un enlace', () => {
    montar({ ...NOTAS, nombre: 'sitio', tipo: 'enlace', destino: '/var/www/sitio' })

    expect(valorDe('Apunta a')).toHaveTextContent('/var/www/sitio')
    expect(screen.queryByText('Tamaño', { selector: 'dt' })).not.toBeInTheDocument()
    // Linux no mira los permisos del enlace, sino los de su destino
    expect(screen.queryByText('Permisos', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('copia la ruta completa', async () => {
    const usuario = userEvent.setup()
    const { onCopiarRuta } = montar()

    await usuario.click(screen.getByRole('button', { name: 'Copiar ruta' }))

    expect(onCopiarRuta).toHaveBeenCalledWith('/home/deploy/notas.txt')
  })

  it('sin propietario del servidor no muestra la fila vacía', () => {
    montar({ ...NOTAS, propietario: undefined, grupo: undefined })

    expect(screen.queryByText('Propietario', { selector: 'dt' })).not.toBeInTheDocument()
  })
})
