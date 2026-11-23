import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DialogoDePermisos } from '@/features/terminal/DialogoDePermisos'

const ENTRADA = { nombre: 'notas.txt', ruta: '/home/deploy/notas.txt', permisos: 'rw-r--r--' }

function montar(entrada = ENTRADA) {
  const onGuardar = vi.fn()
  const onCerrar = vi.fn()
  const vista = render(
    <DialogoDePermisos
      entrada={entrada}
      pendiente={false}
      onGuardar={onGuardar}
      onCerrar={onCerrar}
    />,
  )
  return { ...vista, onGuardar, onCerrar }
}

describe('DialogoDePermisos', () => {
  it('marca las casillas de los permisos que tiene', () => {
    montar()

    expect(screen.getByRole('checkbox', { name: 'Propietario: leer' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Propietario: escribir' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Grupo: escribir' })).not.toBeChecked()
    expect(screen.getByRole('textbox', { name: 'En número' })).toHaveValue('644')
  })

  it('sin cambios no deja guardar', () => {
    montar()

    expect(screen.getByRole('button', { name: 'Cambiar permisos' })).toBeDisabled()
  })

  it('una casilla cambia el número y la forma rwx', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('checkbox', { name: 'Grupo: leer' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Otros: leer' }))

    expect(screen.getByRole('textbox', { name: 'En número' })).toHaveValue('600')
    expect(screen.getByText('rw-------')).toBeInTheDocument()
  })

  it('escribir el número marca las casillas', async () => {
    const usuario = userEvent.setup()
    montar()

    const numero = screen.getByRole('textbox', { name: 'En número' })
    await usuario.clear(numero)
    await usuario.type(numero, '755')

    expect(screen.getByRole('checkbox', { name: 'Propietario: ejecutar' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Otros: ejecutar' })).toBeChecked()
  })

  it('un número incompleto no deja guardar', async () => {
    const usuario = userEvent.setup()
    montar()

    const numero = screen.getByRole('textbox', { name: 'En número' })
    await usuario.clear(numero)
    await usuario.type(numero, '6')

    expect(screen.getByRole('button', { name: 'Cambiar permisos' })).toBeDisabled()
  })

  it('guarda la ruta con el número nuevo', async () => {
    const usuario = userEvent.setup()
    const { onGuardar } = montar()

    await usuario.click(screen.getByRole('checkbox', { name: 'Otros: leer' }))
    await usuario.click(screen.getByRole('button', { name: 'Cambiar permisos' }))

    expect(onGuardar).toHaveBeenCalledWith('/home/deploy/notas.txt', '640')
  })

  it('lo marcado sobrevive a que el panel vuelva a pintarse', async () => {
    // El panel crea la entrada en cada render; con el mismo valor no se reinicia
    const usuario = userEvent.setup()
    const { rerender, onGuardar, onCerrar } = montar()

    await usuario.click(screen.getByRole('checkbox', { name: 'Otros: leer' }))
    rerender(
      <DialogoDePermisos
        entrada={{ ...ENTRADA }}
        pendiente={false}
        onGuardar={onGuardar}
        onCerrar={onCerrar}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'En número' })).toHaveValue('640')
  })

  it('cancelar cierra sin guardar', async () => {
    const usuario = userEvent.setup()
    const { onGuardar, onCerrar } = montar()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCerrar).toHaveBeenCalled()
    expect(onGuardar).not.toHaveBeenCalled()
  })
})
