import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PanelDeTransferencias } from '@/features/terminal/PanelDeTransferencias'
import type { Transferencia } from '@/features/terminal/transferencias'

const transferencia = (cambios: Partial<Transferencia>): Transferencia => ({
  id: 1,
  archivo: new File(['x'], 'a.txt'),
  nombre: 'a.txt',
  carpeta: '/home/deploy',
  crearCarpeta: false,
  estado: 'en-cola',
  enviado: 0,
  total: 10,
  velocidad: null,
  ...cambios,
})

function montar(transferencias: Transferencia[]) {
  const props = {
    transferencias,
    onCancelar: vi.fn(),
    onCancelarTodo: vi.fn(),
    onReintentar: vi.fn(),
    onIrALaCarpeta: vi.fn(),
    onCerrar: vi.fn(),
  }
  render(<PanelDeTransferencias {...props} />)
  return props
}

const EN_CURSO = [
  transferencia({
    id: 1,
    nombre: 'hecho.txt',
    estado: 'lista',
    enviado: 10,
    ruta: '/home/deploy/hecho.txt',
  }),
  transferencia({
    id: 2,
    nombre: 'grande.bin',
    estado: 'subiendo',
    enviado: 50 * 1024 * 1024,
    total: 100 * 1024 * 1024,
    velocidad: 5 * 1024 * 1024,
  }),
  transferencia({ id: 3, nombre: 'otro.txt' }),
]

describe('PanelDeTransferencias', () => {
  it('la cabecera dice cuántos van, el avance, la velocidad y lo que falta', () => {
    montar(EN_CURSO)

    const panel = screen.getByRole('region', { name: 'Subidas' })

    expect(panel).toHaveTextContent('Subiendo 2 de 3')
    expect(panel).toHaveTextContent('5 MB/s')
    expect(panel).toHaveTextContent('quedan 11 s')
  })

  it('cada archivo muestra su estado', () => {
    montar(EN_CURSO)

    const filas = screen.getAllByRole('listitem')

    expect(filas[0]).toHaveTextContent('Subido')
    expect(
      within(filas[1]!).getByRole('progressbar', { name: 'grande.bin' }),
    ).toHaveAttribute('aria-valuenow', '50')
    expect(filas[2]).toHaveTextContent('En cola')
  })

  it('se cancela un archivo, o todos', async () => {
    const usuario = userEvent.setup()
    const { onCancelar, onCancelarTodo } = montar(EN_CURSO)

    await usuario.click(screen.getByRole('button', { name: 'Cancelar otro.txt' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar todas' }))

    expect(onCancelar).toHaveBeenCalledWith(3)
    expect(onCancelarTodo).toHaveBeenCalled()
  })

  it('lo subido lleva a su carpeta en la terminal', async () => {
    const usuario = userEvent.setup()
    const { onIrALaCarpeta } = montar(EN_CURSO)

    await usuario.click(
      screen.getByRole('button', { name: 'Ir a la carpeta de hecho.txt' }),
    )

    expect(onIrALaCarpeta).toHaveBeenCalledWith('/home/deploy/hecho.txt')
  })

  it('si se subió con otro nombre, lo dice', () => {
    montar([
      transferencia({
        nombre: 'notas.txt',
        archivo: new File(['x'], 'notas.txt'),
        estado: 'lista',
        ruta: '/home/deploy/notas (1).txt',
      }),
    ])

    expect(screen.getByRole('listitem')).toHaveTextContent('Subido como notas (1).txt')
  })

  it('cortada la conexión, espera para seguir donde iba', () => {
    montar([transferencia({ estado: 'en-cola', retomar: true, enviado: 4, total: 10 })])

    expect(screen.getByRole('listitem')).toHaveTextContent('Esperando la conexión · 40 %')
  })

  it('un fallo dice por qué y deja reintentar', async () => {
    const usuario = userEvent.setup()
    const { onReintentar } = montar([
      transferencia({ estado: 'error', motivo: 'Sin permiso para escribir.' }),
    ])

    expect(screen.getByRole('listitem')).toHaveTextContent('Sin permiso para escribir.')
    await usuario.click(screen.getByRole('button', { name: 'Reintentar a.txt' }))

    expect(onReintentar).toHaveBeenCalledWith(1)
  })

  it('al terminar resume lo hecho y se puede cerrar', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar([
      transferencia({ id: 1, estado: 'lista' }),
      transferencia({ id: 2, estado: 'omitida' }),
    ])

    expect(screen.getByRole('region', { name: 'Subidas' })).toHaveTextContent('1 subido')
    await usuario.click(screen.getByRole('button', { name: 'Cerrar las subidas' }))

    expect(onCerrar).toHaveBeenCalled()
  })

  it('la lista se pliega para no tapar la terminal', async () => {
    const usuario = userEvent.setup()
    montar(EN_CURSO)

    await usuario.click(screen.getByRole('button', { name: 'Ocultar la lista' }))

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar la lista' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
