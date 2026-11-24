import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DialogoDeConflicto } from '@/features/terminal/DialogoDeConflicto'

function montar(quedan = 0) {
  const onDecidir = vi.fn()
  render(
    <DialogoDeConflicto
      conflicto={{ nombre: 'notas.txt', carpeta: '/home/deploy', quedan }}
      onDecidir={onDecidir}
    />,
  )
  return onDecidir
}

describe('DialogoDeConflicto', () => {
  it('dice qué archivo ya existe y dónde', () => {
    montar()

    const dialogo = screen.getByRole('alertdialog', { name: 'Ya existe notas.txt' })

    expect(dialogo).toHaveTextContent('/home/deploy')
  })

  it('cada botón decide para este archivo', async () => {
    const usuario = userEvent.setup()
    const onDecidir = montar()

    await usuario.click(screen.getByRole('button', { name: 'Conservar ambos' }))

    expect(onDecidir).toHaveBeenCalledWith('renombrar', false)
  })

  it('con más en cola, se puede decidir para todos', async () => {
    const usuario = userEvent.setup()
    const onDecidir = montar(4)

    await usuario.click(
      screen.getByRole('checkbox', { name: 'Hacer lo mismo con los 4 que siguen' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Reemplazar' }))

    expect(onDecidir).toHaveBeenCalledWith('reemplazar', true)
  })

  it('con uno solo no ofrece decidir para todos', () => {
    montar(0)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('omitir deja el archivo del servidor como está', async () => {
    const usuario = userEvent.setup()
    const onDecidir = montar()

    await usuario.click(screen.getByRole('button', { name: 'Omitir' }))

    expect(onDecidir).toHaveBeenCalledWith('omitir', false)
  })
})
