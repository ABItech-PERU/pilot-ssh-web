import { describe, expect, it } from 'vitest'

import { resolveLandingAfterSwitch } from '@/features/organizations/switch'

describe('resolveLandingAfterSwitch', () => {
  it('desde la ficha de un servidor vuelve a la lista de servidores', () => {
    expect(resolveLandingAfterSwitch('/app/servers/8f1c')).toBe('/app/servers')
    expect(resolveLandingAfterSwitch('/app/servers/8f1c/links')).toBe('/app/servers')
  })

  it('desde la terminal tambien: la maquina es de la organizacion anterior', () => {
    expect(resolveLandingAfterSwitch('/app/servers/8f1c/terminal')).toBe('/app/servers')
  })

  it('desde la ficha de una credencial vuelve a la lista de credenciales', () => {
    expect(resolveLandingAfterSwitch('/app/credentials/2b7a/stats')).toBe(
      '/app/credentials',
    )
  })

  it('desde los ajustes de la cuenta va a Servidores: ahi el cambio no se veria', () => {
    expect(resolveLandingAfterSwitch('/app/settings')).toBe('/app/servers')
    expect(resolveLandingAfterSwitch('/app/settings/activity')).toBe('/app/servers')
  })

  it('las listas y los ajustes de la organizacion se quedan donde estan', () => {
    for (const ruta of [
      '/app/servers',
      '/app/credentials',
      '/app/team/groups',
      '/app/credits',
      '/app/organization',
    ]) {
      expect(resolveLandingAfterSwitch(ruta)).toBe(ruta)
    }
  })
})
