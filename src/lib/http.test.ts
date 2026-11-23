import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Recarga los módulos, porque la sesión y el refresco viven en memoria. */
async function cargar() {
  vi.resetModules()
  const http = await import('@/lib/http')
  const store = await import('@/features/auth/token-store')
  return { ...http, store }
}

function responder(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return Promise.resolve({ data, status, statusText: '', headers: {}, config })
}

const SESION = {
  access: 'access-nuevo',
  expires_at: '2026-11-22T07:08:55Z',
  session_id: 'equipo-1',
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('recuperar la sesion al recargar', () => {
  it('pide un access con la cookie y las cabeceras de la web', async () => {
    const { httpConCookie, restoreSession, store } = await cargar()
    const adaptador = vi.fn<AxiosAdapter>((config) => responder(config, 200, SESION))
    httpConCookie.defaults.adapter = adaptador
    window.localStorage.setItem('pilotssh.hay-sesion', '1')

    await restoreSession()

    const config = adaptador.mock.lastCall?.[0]
    expect(config?.url).toBe('/auth/refresh')
    expect(config?.withCredentials).toBe(true)
    expect(config?.headers['X-Pilot-Ssh']).toBe('1')
    expect(config?.data).toBeUndefined()
    expect(store.getSession()).toEqual({
      access: 'access-nuevo',
      expiresAt: SESION.expires_at,
      sessionId: 'equipo-1',
    })
  })

  it('sin la marca de sesion no llama a la API', async () => {
    const { httpConCookie, restoreSession, store } = await cargar()
    const adaptador = vi.fn<AxiosAdapter>((config) => responder(config, 200, SESION))
    httpConCookie.defaults.adapter = adaptador

    await restoreSession()

    expect(adaptador).not.toHaveBeenCalled()
    expect(store.getSession()).toBeNull()
  })

  it('si la cookie ya no vale, queda sin sesion y sin marca', async () => {
    const { httpConCookie, restoreSession, store } = await cargar()
    httpConCookie.defaults.adapter = (config) =>
      Promise.reject(
        Object.assign(new Error('401'), {
          isAxiosError: true,
          config,
          response: { status: 401, data: { code: 'token_invalido' } },
        }),
      )
    window.localStorage.setItem('pilotssh.hay-sesion', '1')

    await restoreSession()

    expect(store.getSession()).toBeNull()
    expect(store.mayHaveSession()).toBe(false)
  })

  it('dos recuperaciones a la vez hacen un solo refresco', async () => {
    const { httpConCookie, restoreSession } = await cargar()
    const adaptador = vi.fn<AxiosAdapter>((config) => responder(config, 200, SESION))
    httpConCookie.defaults.adapter = adaptador
    window.localStorage.setItem('pilotssh.hay-sesion', '1')

    await Promise.all([restoreSession(), restoreSession()])

    expect(adaptador).toHaveBeenCalledTimes(1)
  })
})

describe('peticiones con sesion', () => {
  it('un access caducado se renueva y la peticion se repite con el nuevo', async () => {
    const { http, httpConCookie, store } = await cargar()
    store.saveSession({ access: 'access-viejo', expiresAt: '' })
    httpConCookie.defaults.adapter = (config) => responder(config, 200, SESION)
    const vistos: string[] = []
    http.defaults.adapter = (config) => {
      const cabecera = String(config.headers.Authorization)
      vistos.push(cabecera)
      if (cabecera === 'Bearer access-viejo') {
        return Promise.reject(
          Object.assign(new Error('401'), {
            isAxiosError: true,
            config,
            response: { status: 401, data: { code: 'token_invalido' } },
          }),
        )
      }
      return responder(config, 200, { ok: true })
    }

    const { data } = await http.get('/me')

    expect(data).toEqual({ ok: true })
    expect(vistos).toEqual(['Bearer access-viejo', 'Bearer access-nuevo'])
  })
})

describe('la cookie del refresh entre dominios', () => {
  it('el login va con credenciales, o el navegador descarta la cookie', async () => {
    const { http } = await cargar()
    const authApi = await import('@/features/auth/api')
    const adaptador = vi.fn<AxiosAdapter>((config) =>
      responder(config, 200, { ...SESION, user: {} }),
    )
    http.defaults.adapter = adaptador

    await authApi.login({ email: 'ana@acme.pe', password: 'clave' })

    expect(adaptador.mock.lastCall?.[0].withCredentials).toBe(true)
  })

  it('el segundo paso tambien va con credenciales', async () => {
    const { http } = await cargar()
    const authApi = await import('@/features/auth/api')
    const adaptador = vi.fn<AxiosAdapter>((config) =>
      responder(config, 200, { ...SESION, user: {} }),
    )
    http.defaults.adapter = adaptador

    await authApi.verifyTwoFactor({ challenge: 'desafio', code: '123456' })

    expect(adaptador.mock.lastCall?.[0].withCredentials).toBe(true)
  })
})
