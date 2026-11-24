import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FolderIcon, SparklesIcon } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { PanelLateral } from '@/features/terminal/PanelLateral'

function montar() {
  const onCerrar = vi.fn()
  render(
    <PanelLateral
      onCerrar={onCerrar}
      pestanas={[
        {
          id: 'archivos',
          etiqueta: 'Archivos',
          icono: FolderIcon,
          contenido: <p>Lista</p>,
        },
        {
          id: 'asistente',
          etiqueta: 'Asistente',
          icono: SparklesIcon,
          contenido: <p>Chat</p>,
        },
      ]}
    />,
  )
  return { onCerrar }
}

describe('PanelLateral', () => {
  it('abre en la primera pestaña', () => {
    montar()

    expect(screen.getByRole('tab', { name: 'Archivos' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel', { name: 'Archivos' })).toHaveTextContent('Lista')
    expect(screen.queryByText('Chat')).not.toBeVisible()
  })

  it('cambia de pestaña con un clic y conserva la otra montada', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('tab', { name: 'Asistente' }))

    expect(screen.getByRole('tabpanel', { name: 'Asistente' })).toHaveTextContent('Chat')
    expect(screen.getByText('Lista')).not.toBeVisible()
  })

  it('las flechas recorren las pestañas, como en cualquier lista de pestañas', async () => {
    const usuario = userEvent.setup()
    montar()

    screen.getByRole('tab', { name: 'Archivos' }).focus()
    await usuario.keyboard('{ArrowRight}')

    const asistente = screen.getByRole('tab', { name: 'Asistente' })
    expect(asistente).toHaveFocus()
    expect(asistente).toHaveAttribute('aria-selected', 'true')

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Archivos' })).toHaveFocus()
  })

  it('se cierra con su botón', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = montar()

    await usuario.click(screen.getByRole('button', { name: 'Cerrar el panel' }))

    expect(onCerrar).toHaveBeenCalledOnce()
  })
})
