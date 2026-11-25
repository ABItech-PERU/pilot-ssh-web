import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DireccionIp } from '@/components/direccion-ip'

describe('DireccionIp', () => {
  it('muestra la IPv6 entera y la deja partir en cada grupo', () => {
    const { container } = render(
      <DireccionIp valor="2803:5350:6:6fa:7076:1fed:ca5a:f13b" />,
    )

    expect(container).toHaveTextContent('2803:5350:6:6fa:7076:1fed:ca5a:f13b')
    expect(container.querySelectorAll('wbr')).toHaveLength(7)
  })

  it('una IPv4 queda en una pieza', () => {
    const { container } = render(<DireccionIp valor="190.237.10.4" />)

    expect(container).toHaveTextContent('190.237.10.4')
    expect(container.querySelectorAll('wbr')).toHaveLength(0)
  })

  it('sin IP muestra una raya', () => {
    const { container } = render(<DireccionIp valor={null} />)

    expect(container).toHaveTextContent('—')
  })
})
