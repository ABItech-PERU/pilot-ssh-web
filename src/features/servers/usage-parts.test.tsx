import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Ranking } from '@/features/servers/usage-parts'

describe('Ranking', () => {
  it('una IPv6 se ve entera y se parte en sus grupos', () => {
    const { container } = render(
      <Ranking
        filas={[{ nombre: '2803:5350:6:6fa:7076:1fed:ca5a:f13b', total: 4, esIp: true }]}
        vacio={null}
      />,
    )

    expect(container).toHaveTextContent('2803:5350:6:6fa:7076:1fed:ca5a:f13b')
    expect(container.querySelectorAll('wbr')).toHaveLength(7)
  })

  it('un usuario sigue en una pieza', () => {
    const { container } = render(
      <Ranking filas={[{ nombre: 'deploy', total: 19, maquina: true }]} vacio={null} />,
    )

    expect(screen.getByText('deploy')).toBeInTheDocument()
    expect(container.querySelectorAll('wbr')).toHaveLength(0)
  })
})
