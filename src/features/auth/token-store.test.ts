import { beforeEach, describe, expect, it, vi } from 'vitest'

const CLAVE = 'pilotssh.session'

/** Recarga el módulo: cachea la sesión entre pruebas. */
async function cargarStore() {
  vi.resetModules()
  return import('@/features/auth/token-store')
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('token-store', () => {
  it('devuelve la sesion guardada', async () => {
    window.localStorage.setItem(
      CLAVE,
      JSON.stringify({ access: 'a', refresh: 'r', expiresAt: '' }),
    )
    const store = await cargarStore()

    expect(store.getAccessToken()).toBe('a')
  })

  it('una entrada corrupta no rompe el arranque, pide login', async () => {
    window.localStorage.setItem(CLAVE, '{esto no es json')
    const store = await cargarStore()

    expect(store.getSession()).toBeNull()
  })

  it('una entrada sin refresh no vale como sesion', async () => {
    window.localStorage.setItem(CLAVE, JSON.stringify({ access: 'a' }))
    const store = await cargarStore()

    expect(store.getSession()).toBeNull()
  })

  it('avisa a quien escucha cuando la sesion cambia', async () => {
    const store = await cargarStore()
    const escucha = vi.fn()
    store.subscribe(escucha)

    store.saveSession({ access: 'a', refresh: 'r', expiresAt: '' })

    expect(escucha).toHaveBeenCalledTimes(1)
    expect(store.getAccessToken()).toBe('a')
  })

  it('cerrar sesion borra el token y avisa', async () => {
    const store = await cargarStore()
    store.saveSession({ access: 'a', refresh: 'r', expiresAt: '' })
    const escucha = vi.fn()
    store.subscribe(escucha)

    store.clearSession()

    expect(store.getSession()).toBeNull()
    expect(window.localStorage.getItem(CLAVE)).toBeNull()
    expect(escucha).toHaveBeenCalledTimes(1)
  })

  it('cerrar sesion en otra pestana deja esta sin token', async () => {
    const store = await cargarStore()
    store.saveSession({ access: 'a', refresh: 'r', expiresAt: '' })

    window.dispatchEvent(new StorageEvent('storage', { key: CLAVE, newValue: null }))

    expect(store.getSession()).toBeNull()
  })
})
