import { describe, expect, it } from 'vitest'

import {
  buildInitials,
  formatCredits,
  formatDay,
  formatFileSize,
  formatPrice,
  formatRelative,
} from '@/lib/format'

describe('formatFileSize', () => {
  it('crece de bytes a megas, con el decimal solo cuando pesa', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(251_000)).toBe('245 KB')
    expect(formatFileSize(1_258_291)).toBe('1,2 MB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
  })
})

describe('buildInitials', () => {
  it('toma la primera y la ultima palabra', () => {
    expect(buildInitials('Abimael Fernández')).toBe('AF')
  })

  it('con tres palabras salta las del medio', () => {
    expect(buildInitials('Ana de la Cruz')).toBe('AC')
  })

  it('con una sola palabra usa sus dos primeras letras', () => {
    expect(buildInitials('ana')).toBe('AN')
  })

  it('un nombre en minuscula sale en mayuscula: una inicial no es un nombre', () => {
    expect(buildInitials('abimael fernandez')).toBe('AF')
  })

  it('sin nombre no revienta el avatar', () => {
    expect(buildInitials('   ')).toBe('?')
  })
})

describe('formatRelative', () => {
  it('sin fecha dice que nunca se uso', () => {
    expect(formatRelative(null)).toBe('Nunca')
  })

  it('hace unos segundos no se cuenta en minutos', () => {
    expect(formatRelative(new Date().toISOString())).toBe('Ahora')
  })

  it('abrevia la unidad: una columna no cabe "hace 7 minutos"', () => {
    const hace7Minutos = new Date(Date.now() - 7 * 60_000).toISOString()
    expect(formatRelative(hace7Minutos)).toBe('Hace 7 min')
  })

  it('en horas tambien abrevia', () => {
    const hace3Horas = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(formatRelative(hace3Horas)).toBe('Hace 3 h')
  })

  it('el dia de antes se dice con su nombre, no con un numero', () => {
    const ayer = new Date(Date.now() - 26 * 3_600_000).toISOString()
    expect(formatRelative(ayer)).toBe('Ayer')
  })

  it('empieza en mayuscula: en la columna convive con "Nunca"', () => {
    const hace2Horas = new Date(Date.now() - 2 * 3_600_000).toISOString()
    expect(formatRelative(hace2Horas).charAt(0)).toBe('H')
  })

  it('pasada una semana da la fecha: "hace 3 m" se leeria como minutos', () => {
    const hace40Dias = new Date(Date.now() - 40 * 86_400_000)
    expect(formatRelative(hace40Dias.toISOString())).toBe(
      new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(
        hace40Dias,
      ),
    )
  })

  it('de otro ano lleva el ano: sin el, marzo es cualquier marzo', () => {
    const hace2Anos = new Date(Date.now() - 2 * 365 * 86_400_000)
    expect(formatRelative(hace2Anos.toISOString())).toContain(
      String(hace2Anos.getFullYear()),
    )
  })
})

describe('formatCredits', () => {
  it('recorta los decimales que manda el backend', () => {
    expect(formatCredits('500.0000')).toBe('500')
  })

  it('un valor ilegible no pinta NaN en pantalla', () => {
    expect(formatCredits('nada')).toBe('0')
  })
})

describe('formatPrice', () => {
  it('pone el símbolo que se lee en un recibo', () => {
    expect(formatPrice('50.00', 'PEN')).toBe('S/ 50')
  })

  it('los céntimos van enteros cuando los hay', () => {
    expect(formatPrice('12.50', 'PEN')).toBe('S/ 12,50')
  })
})

describe('formatDay', () => {
  it('un día sin hora no se corre al anterior por la zona horaria', () => {
    expect(formatDay('2026-03-12')).toBe('12 mar')
  })
})
