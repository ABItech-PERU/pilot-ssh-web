import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import {
  applyFieldErrors,
  looksAllLowercase,
  normalizeSpacing,
  suggestNameCasing,
} from '@/lib/form'

interface Formulario {
  name: string
  ip: string
}

function errorDeValidacion(errors: Record<string, string[]>): AxiosError {
  const error = new AxiosError('fallo')
  error.response = {
    status: 400,
    data: { message: 'Revisa los datos.', code: 'validacion_fallida', errors },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('applyFieldErrors', () => {
  it('pone cada error en su campo del formulario', () => {
    const setError = vi.fn()

    const general = applyFieldErrors<Formulario>(
      errorDeValidacion({ ip: ['Esa direccion no es valida.'] }),
      setError,
      ['name', 'ip'],
    )

    expect(setError).toHaveBeenCalledWith('ip', {
      type: 'server',
      message: 'Esa direccion no es valida.',
    })
    expect(general).toBeNull()
  })

  it('un campo que el formulario no tiene se muestra igual', () => {
    const setError = vi.fn()

    const general = applyFieldErrors<Formulario>(
      errorDeValidacion({ organization: ['Elige una organizacion.'] }),
      setError,
      ['name', 'ip'],
    )

    expect(setError).not.toHaveBeenCalled()
    expect(general).toBe('Elige una organizacion.')
  })

  it('el fallo sin errores por campo vuelve como aviso general', () => {
    const setError = vi.fn()
    const error = new AxiosError('fallo')
    error.response = {
      status: 403,
      data: { message: 'No puedes anadir servidores aqui.', code: 'sin_permiso' },
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }

    const general = applyFieldErrors<Formulario>(error, setError, ['name', 'ip'])

    expect(general).toBe('No puedes anadir servidores aqui.')
  })
})

describe('normalizeSpacing', () => {
  it('quita los espacios de los extremos', () => {
    expect(normalizeSpacing('  Abimael Fernández  ')).toBe('Abimael Fernández')
  })

  it('colapsa los espacios de dentro', () => {
    expect(normalizeSpacing('Abimael    Fernández')).toBe('Abimael Fernández')
  })

  it('respeta un apellido en minuscula', () => {
    expect(normalizeSpacing('Ana de la Cruz')).toBe('Ana de la Cruz')
  })

  it('respeta la mayuscula interior de un apellido', () => {
    expect(normalizeSpacing('Ian McDonald')).toBe('Ian McDonald')
  })

  it('no arregla el nombre todo en minuscula: es decision de quien escribe', () => {
    expect(normalizeSpacing('abimael fernandez')).toBe('abimael fernandez')
  })
})

describe('suggestNameCasing', () => {
  it('propone mayuscula inicial en cada palabra', () => {
    expect(suggestNameCasing('abimael fernandez')).toBe('Abimael Fernandez')
  })

  it('deja en minuscula las particulas de un apellido compuesto', () => {
    expect(suggestNameCasing('ana de la cruz')).toBe('Ana de la Cruz')
  })

  it('la particula al inicio si lleva mayuscula', () => {
    expect(suggestNameCasing('del valle rojas')).toBe('Del Valle Rojas')
  })

  it('de paso normaliza los espacios', () => {
    expect(suggestNameCasing('  ana   perez ')).toBe('Ana Perez')
  })
})

describe('looksAllLowercase', () => {
  it('reconoce el nombre escrito con prisa', () => {
    expect(looksAllLowercase('abimael fernandez')).toBe(true)
  })

  it('con una sola mayuscula ya no propone nada', () => {
    expect(looksAllLowercase('Abimael fernandez')).toBe(false)
  })

  it('respeta una firma en minuscula ya aceptada por quien la escribio', () => {
    // bell hooks se sigue detectando; lo que decide es que la propuesta
    // se puede ignorar, no que no aparezca
    expect(looksAllLowercase('bell hooks')).toBe(true)
  })
})
