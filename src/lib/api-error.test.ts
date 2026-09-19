import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { ApiError, toApiError } from '@/lib/api-error'

function respuestaDe(status: number, data: unknown): AxiosError {
  const error = new AxiosError('fallo')
  error.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('toApiError', () => {
  it('conserva el mensaje y el codigo que manda el backend', () => {
    const fallo = toApiError(
      respuestaDe(400, {
        message: 'Requiere eliminar antes sus 3 servidores.',
        code: 'organizacion_con_servidores',
      }),
    )

    expect(fallo).toBeInstanceOf(ApiError)
    expect(fallo.message).toBe('Requiere eliminar antes sus 3 servidores.')
    expect(fallo.code).toBe('organizacion_con_servidores')
    expect(fallo.status).toBe(400)
  })

  it('separa los errores por campo del mensaje general', () => {
    const fallo = toApiError(
      respuestaDe(400, {
        message: 'Revisa los datos.',
        code: 'validacion_fallida',
        errors: { port: ['El puerto va entre 1 y 65535.'] },
      }),
    )

    expect(fallo.hasFieldErrors).toBe(true)
    expect(fallo.fieldErrors.port).toEqual(['El puerto va entre 1 y 65535.'])
  })

  it('el backend caido no llega como error tecnico a la pantalla', () => {
    const fallo = toApiError(new AxiosError('Network Error'))

    expect(fallo.code).toBe('sin_conexion')
    expect(fallo.message).not.toContain('Network')
  })

  it('una pagina de error de un proxy no se muestra como si fuera el sobre', () => {
    const fallo = toApiError(respuestaDe(502, '<html>Bad Gateway</html>'))

    expect(fallo.code).toBe('error_inesperado')
    expect(fallo.message).not.toContain('html')
  })

  it('un permiso denegado no se reintenta', () => {
    const fallo = toApiError(
      respuestaDe(403, { message: 'No puedes hacer esto.', code: 'sin_permiso' }),
    )

    expect(fallo.isRetryable).toBe(false)
  })

  it('un fallo del servidor si se reintenta', () => {
    expect(toApiError(respuestaDe(503, null)).isRetryable).toBe(true)
  })
})
