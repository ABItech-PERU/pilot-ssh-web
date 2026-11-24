import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DivisorDePanel } from '@/features/terminal/DivisorDePanel'

function montar(ancho = 400) {
  const props = {
    ancho,
    minimo: 300,
    maximo: 700,
    controla: 'panel',
    onCambiar: vi.fn(),
    onTerminar: vi.fn(),
    onReiniciar: vi.fn(),
  }
  render(<DivisorDePanel {...props} />)
  return { ...props, divisor: screen.getByRole('separator', { name: 'Ancho del panel' }) }
}

describe('DivisorDePanel', () => {
  it('anuncia el ancho y sus límites', () => {
    const { divisor } = montar()

    expect(divisor).toHaveAttribute('aria-orientation', 'vertical')
    expect(divisor).toHaveAttribute('aria-valuenow', '400')
    expect(divisor).toHaveAttribute('aria-valuemin', '300')
    expect(divisor).toHaveAttribute('aria-valuemax', '700')
    expect(divisor).toHaveAttribute('aria-controls', 'panel')
  })

  it('con las flechas ensancha hacia la izquierda y estrecha hacia la derecha', async () => {
    const usuario = userEvent.setup()
    const { divisor, onCambiar, onTerminar } = montar()

    divisor.focus()
    await usuario.keyboard('{ArrowLeft}')
    await usuario.keyboard('{ArrowRight}')

    expect(onCambiar).toHaveBeenNthCalledWith(1, 416)
    expect(onCambiar).toHaveBeenNthCalledWith(2, 384)
    expect(onTerminar).toHaveBeenCalledTimes(2)
  })

  it('con Shift da pasos largos, e Inicio y Fin van a los extremos', async () => {
    const usuario = userEvent.setup()
    const { divisor, onCambiar } = montar()

    divisor.focus()
    await usuario.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    await usuario.keyboard('{Home}')
    await usuario.keyboard('{End}')

    expect(onCambiar.mock.calls.map(([ancho]) => ancho)).toEqual([464, 300, 700])
  })

  it('al arrastrar sigue al puntero y guarda al soltar', () => {
    const { divisor, onCambiar, onTerminar } = montar()

    fireEvent.pointerDown(divisor, { button: 0, clientX: 800, pointerId: 1 })
    fireEvent.pointerMove(divisor, { clientX: 700, pointerId: 1 })
    expect(onTerminar).not.toHaveBeenCalled()
    fireEvent.pointerUp(divisor, { clientX: 700, pointerId: 1 })

    expect(onCambiar).toHaveBeenLastCalledWith(500)
    expect(onTerminar).toHaveBeenCalledOnce()
  })

  it('el doble clic lo devuelve al ancho inicial', () => {
    const { divisor, onReiniciar } = montar()

    fireEvent.doubleClick(divisor)

    expect(onReiniciar).toHaveBeenCalledOnce()
  })
})
