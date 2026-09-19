import type { AuditEntry } from '@/types/api'

export interface CampoCambiado {
  label: string
  before: string
  after: string
}

/** Desglose guardado en el registro. Los antiguos no lo traen: solo
 *  tienen su frase. */
export function camposDelCambio(entrada: AuditEntry | null): CampoCambiado[] {
  const campos = entrada?.metadata?.fields
  if (!Array.isArray(campos)) return []

  return campos.filter(
    (campo): campo is CampoCambiado =>
      typeof campo === 'object' &&
      campo !== null &&
      typeof (campo as CampoCambiado).label === 'string',
  )
}

export interface ValorDelCambio {
  label: string
  value: string
}

/** El paquete al crearlo o borrarlo. Borrado, es el único registro de
 *  su precio. */
export function retratoDelCambio(entrada: AuditEntry | null): ValorDelCambio[] {
  const valores = entrada?.metadata?.snapshot
  if (!Array.isArray(valores)) return []

  return valores.filter(
    (valor): valor is ValorDelCambio =>
      typeof valor === 'object' &&
      valor !== null &&
      typeof (valor as ValorDelCambio).label === 'string',
  )
}

/** «Nombre, precio y créditos»; los valores van en el detalle. */
export function listarCampos(entrada: AuditEntry | null): string {
  const nombres = camposDelCambio(entrada).map((campo) => campo.label.toLowerCase())
  if (nombres.length === 0) return ''

  const primero = nombres[0]!
  const enMayuscula = primero.charAt(0).toUpperCase() + primero.slice(1)
  const resto = nombres.slice(1)
  if (resto.length === 0) return enMayuscula

  return `${[enMayuscula, ...resto.slice(0, -1)].join(', ')} y ${resto.at(-1)}`
}

/** Qué se tocó, sin valores: la frase entera desborda la celda. */
export function tituloDelCambio(entrada: AuditEntry): string {
  return entrada.description.split(': ')[0] ?? entrada.description
}

/** Acción y nombre por separado, para destacar el nombre: en «Creó el
 *  paquete Regalo Navidad» no se ve dónde empieza. */
export function partirTitulo(entrada: AuditEntry): { accion: string; nombre: string } {
  const titulo = tituloDelCambio(entrada)
  const nombre = entrada.metadata?.package
  if (typeof nombre !== 'string' || !titulo.endsWith(nombre)) {
    return { accion: titulo, nombre: '' }
  }

  return { accion: titulo.slice(0, -nombre.length).trimEnd(), nombre }
}
