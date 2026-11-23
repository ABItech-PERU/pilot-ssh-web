import { beforeEach, describe, expect, it, vi } from 'vitest'

const MARCA = 'pilotssh.hay-sesion'
const SESION_VIEJA = 'pilotssh.session'

/** Recarga el módulo, que guarda la sesión en memoria entre pruebas. */
async function cargarStore() {
  vi.resetModules()
  return import('@/features/auth/token-store')
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('token-store', () => {
  it('al arrancar no hay sesion en memoria', async () => {
    const store = await cargarStore()

    expect(store.getSession()).toBeNull()
  })

  it('el token no se escribe en el almacenamiento del navegador', async () => {
    const store = await cargarStore()

    store.saveSession({ access: 'secreto', expiresAt: '', sessionId: 'equipo' })

    expect(JSON.stringify({ ...window.localStorage })).not.toContain('secreto')
    expect(store.getAccessToken()).toBe('secreto')
  })

  it('borra la sesion que versiones anteriores dejaban en localStorage', async () => {
    window.localStorage.setItem(SESION_VIEJA, JSON.stringify({ access: 'a', refresh: 'r' }))

    await cargarStore()

    expect(window.localStorage.getItem(SESION_VIEJA)).toBeNull()
  })

  it('deja una marca para recuperar la sesion al recargar', async () => {
    const store = await cargarStore()
    expect(store.mayHaveSession()).toBe(false)

    store.saveSession({ access: 'a', expiresAt: '' })

    expect(store.mayHaveSession()).toBe(true)
  })

  it('avisa a quien escucha cuando la sesion cambia', async () => {
    const store = await cargarStore()
    const escucha = vi.fn()
    store.subscribe(escucha)

    store.saveSession({ access: 'a', expiresAt: '' })

    expect(escucha).toHaveBeenCalledTimes(1)
  })

  it('cerrar sesion borra el token y la marca, y avisa', async () => {
    const store = await cargarStore()
    store.saveSession({ access: 'a', expiresAt: '' })
    const escucha = vi.fn()
    store.subscribe(escucha)

    store.clearSession()

    expect(store.getSession()).toBeNull()
    expect(store.mayHaveSession()).toBe(false)
    expect(escucha).toHaveBeenCalledTimes(1)
  })

  it('cerrar sesion en otra pestana deja esta sin token', async () => {
    const store = await cargarStore()
    store.saveSession({ access: 'a', expiresAt: '' })

    window.dispatchEvent(new StorageEvent('storage', { key: MARCA, newValue: null }))

    expect(store.getSession()).toBeNull()
  })

  it('entrar en otra pestana avisa a esta para recuperar la sesion', async () => {
    const store = await cargarStore()
    const alEntrarFuera = vi.fn()
    store.onSignedInElsewhere(alEntrarFuera)

    window.dispatchEvent(new StorageEvent('storage', { key: MARCA, newValue: '1' }))

    expect(alEntrarFuera).toHaveBeenCalledTimes(1)
  })
})
