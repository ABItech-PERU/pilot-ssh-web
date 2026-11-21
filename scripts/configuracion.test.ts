import { readConfiguracion } from './configuracion.mjs'

const PUBLICA = {
  APP_API_URL: 'https://api.pilotssh.pe',
  APP_SITE_URL: 'https://app.pilotssh.pe',
}

describe('readConfiguracion', () => {
  it('acepta los tres ambientes', () => {
    expect(readConfiguracion({ APP_ENV: 'local' }).ambiente).toBe('local')
    expect(readConfiguracion({ APP_ENV: 'uat', ...PUBLICA }).ambiente).toBe('uat')
    expect(readConfiguracion({ APP_ENV: 'prod', ...PUBLICA }).ambiente).toBe('prod')
  })

  it('rechaza un ambiente que no existe', () => {
    expect(() => readConfiguracion({ APP_ENV: 'prd', ...PUBLICA })).toThrow(
      'APP_ENV debe ser local, uat, prod',
    )
  })

  it('en local no exige direcciones públicas', () => {
    expect(readConfiguracion({ APP_ENV: 'local' }).apiUrl).toBe('')
  })

  it('fuera de local exige https', () => {
    expect(() =>
      readConfiguracion({ APP_ENV: 'prod', APP_API_URL: 'http://api.pilotssh.pe' }),
    ).toThrow('APP_API_URL tiene que ser un origen público con https')
  })
})
