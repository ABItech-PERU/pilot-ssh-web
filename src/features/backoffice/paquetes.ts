/** Cálculo y presentación de paquetes. Su número no es fijo: finanzas
 *  puede añadir más. */

/** Regalo sobre lo pagado, en porcentaje: «+20%» compara mejor que
 *  «2000 de regalo». */
export function porcentajeDeRegalo(paquete: {
  credits: string
  bonus_credits: string
}): number | null {
  const pagados = Number(paquete.credits)
  const regalo = Number(paquete.bonus_credits)
  if (!(pagados > 0) || !(regalo > 0)) return null

  // Menos de un 1% no se anuncia: se leería «+0%»
  const porcentaje = Math.round((regalo / pagados) * 100)
  return porcentaje > 0 ? porcentaje : null
}

/** Por encima, las fichas ocuparían media pantalla: se usa una lista. */
export const MUCHOS_PAQUETES = 6

export function conListaDesplegable(cuantos: number): boolean {
  return cuantos > MUCHOS_PAQUETES
}

/** Columnas sin fila coja: seis de tres en tres, cuatro de dos en dos.
 *  Si ninguna cuadra, tres. */
export function columnasDePaquetes(cuantos: number): 2 | 3 {
  if (cuantos % 3 === 0) return 3
  if (cuantos % 2 === 0) return 2
  return 3
}

/** Precio efectivo del crédito; delata un paquete incoherente. */
export function precioPorCredito(
  precio: string | number,
  creditos: string | number,
): number | null {
  const soles = Number(precio)
  const cuantos = Number(creditos)
  if (!(soles > 0) || !(cuantos > 0)) return null
  return soles / cuantos
}

/** Hasta cuatro decimales, para distinguir paquetes; sin ceros de relleno,
 *  que harían leer «S/ 0,0100» como cien. */
const HASTA_CUATRO = new Intl.NumberFormat('es', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

export function formatearUnitario(valor: string | number): string {
  return `S/ ${HASTA_CUATRO.format(Number(valor))}`
}

export function describirPrecioPorCredito(
  precio: string | number,
  creditos: string | number,
): string | null {
  const unitario = precioPorCredito(precio, creditos)
  return unitario === null ? null : `${formatearUnitario(unitario)} por crédito`
}

/** Día del campo a instante del servidor. El fin toma el último segundo:
 *  «hasta el 10» incluye el 10 entero. */
export function diaAInstante(dia: string, borde: 'inicio' | 'fin'): string | null {
  if (!dia) return null
  const hora = borde === 'inicio' ? '00:00:00' : '23:59:59'
  const instante = new Date(`${dia}T${hora}`)
  return Number.isNaN(instante.getTime()) ? null : instante.toISOString()
}

/** Inverso de `diaAInstante`, para rellenar el campo al editar. */
export function instanteADia(iso: string | null): string {
  if (!iso) return ''
  const instante = new Date(iso)
  if (Number.isNaN(instante.getTime())) return ''
  const mes = String(instante.getMonth() + 1).padStart(2, '0')
  const dia = String(instante.getDate()).padStart(2, '0')
  return `${instante.getFullYear()}-${mes}-${dia}`
}

/** Activo y dentro de su ventana. Espeja la regla del servidor. */
export function seOfreceAhora(
  paquete: {
    is_active: boolean
    available_from: string | null
    available_until: string | null
  },
  ahora = new Date(),
): boolean {
  if (!paquete.is_active) return false
  if (paquete.available_from && ahora < new Date(paquete.available_from)) return false
  return !(paquete.available_until && ahora > new Date(paquete.available_until))
}

/** Créditos que corresponden al precio según el valor vigente. Impide un
 *  paquete de S/ 30 con 500 créditos. */
export function creditosPorPrecio(
  precio: string | number,
  unitario: string | null,
): number | null {
  const soles = Number(precio)
  const valor = Number(unitario)
  if (!(soles > 0) || !(valor > 0)) return null
  return Math.round((soles / valor) * 100) / 100
}

/** Regalo en porcentaje sobre lo pagado; `regaloEnCreditos` es el
 *  inverso. El campo acepta cualquiera de los dos. */
export function regaloEnPorcentaje(
  regalo: string | number,
  base: string | number,
): string {
  const cuantos = Number(regalo)
  const pagados = Number(base)
  if (!(pagados > 0) || !(cuantos > 0)) return ''
  return String(Math.round((cuantos / pagados) * 1000) / 10)
}

export function regaloEnCreditos(
  porcentaje: string | number,
  base: string | number,
): string {
  const parte = Number(porcentaje)
  const pagados = Number(base)
  if (!(pagados > 0) || !(parte > 0)) return '0'
  return String(Math.round(pagados * parte) / 100)
}
