import { LaptopIcon, SmartphoneIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { iconoDeEquipo } from '@/features/account/equipos'

describe('iconoDeEquipo', () => {
  it('un móvil se ve como móvil', () => {
    expect(iconoDeEquipo('Safari en iPhone')).toBe(SmartphoneIcon)
    expect(iconoDeEquipo('Chrome en Android')).toBe(SmartphoneIcon)
  })

  it('lo demás, como portátil', () => {
    expect(iconoDeEquipo('Chrome en Windows')).toBe(LaptopIcon)
  })
})
