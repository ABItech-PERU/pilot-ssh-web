import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError, toApiError } from '@/lib/api-error'

/** Vuelca `errors` del sobre del backend sobre el formulario. Lo que no
 *  cae en ningun campo vuelve como texto para el aviso general. */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
): string | null {
  const fallo: ApiError = toApiError(error)

  if (!fallo.hasFieldErrors) return fallo.message

  const sueltos: string[] = []

  for (const [campo, mensajes] of Object.entries(fallo.fieldErrors)) {
    const texto = mensajes.join(' ')
    if (campos.includes(campo as Path<T>)) {
      setError(campo as Path<T>, { type: 'server', message: texto })
    } else {
      sueltos.push(texto)
    }
  }

  return sueltos.length > 0 ? sueltos.join(' ') : null
}

/** Recorta y colapsa espacios. No toca mayusculas: `de la Cruz` o
 *  `McDonald` se guardan como se escribieron. */
export function normalizeSpacing(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ')
}

/** En minuscula salvo como primera palabra: `Ana de la Cruz`. */
const PARTICULAS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'e',
  'da',
  'das',
  'do',
  'dos',
  'van',
  'von',
  'di',
  'du',
  'der',
  'den',
])

/** El nombre con mayusculas. Es una propuesta que se puede ignorar, nunca
 *  una transformacion automatica. */
export function suggestNameCasing(valor: string): string {
  return normalizeSpacing(valor)
    .split(' ')
    .map((palabra, indice) => {
      const bajo = palabra.toLocaleLowerCase('es')
      if (indice > 0 && PARTICULAS.has(bajo)) return bajo
      return bajo.charAt(0).toLocaleUpperCase('es') + bajo.slice(1)
    })
    .join(' ')
}

/** Sin una sola mayuscula. Con alguna, se respeta lo que se escribio. */
export function looksAllLowercase(valor: string): boolean {
  return valor.length > 0 && valor === valor.toLocaleLowerCase('es')
}
