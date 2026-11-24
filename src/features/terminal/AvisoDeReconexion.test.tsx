import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AvisoDeReconexion } from '@/features/terminal/AvisoDeReconexion'

describe('AvisoDeReconexion', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('un corte que se resuelve enseguida no se anuncia', () => {
    const { rerender } = render(<AvisoDeReconexion fase="reconectando" />)

    act(() => vi.advanceTimersByTime(300))
    rerender(<AvisoDeReconexion fase="conectada" />)

    expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument()
    expect(screen.queryByText('Reconectado')).not.toBeInTheDocument()
  })

  it('un corte que dura se anuncia, y su vuelta también', () => {
    const { rerender } = render(<AvisoDeReconexion fase="reconectando" />)

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByTestId('aviso-de-reconexion')).toHaveTextContent('Reconectando…')

    rerender(<AvisoDeReconexion fase="conectada" />)
    expect(screen.getByTestId('aviso-de-reconexion')).toHaveTextContent('Reconectado')

    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByText('Reconectado')).not.toBeInTheDocument()
  })

  it('si no logra volver, no dice que volvió', () => {
    const { rerender } = render(<AvisoDeReconexion fase="reconectando" />)

    act(() => vi.advanceTimersByTime(1000))
    rerender(<AvisoDeReconexion fase="cerrada" />)

    expect(screen.queryByText('Reconectado')).not.toBeInTheDocument()
    expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument()
  })
})
