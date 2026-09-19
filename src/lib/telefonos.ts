/** Teléfonos en E.164, como los piden WhatsApp y los SMS: prefijo de país
 *  y hasta quince dígitos, sin espacios ni guiones.
 *
 *  Los países viven aquí y no en la base: cambian cada varios años y añadir
 *  uno es una línea. */
export interface Pais {
  codigo: string
  nombre: string
  prefijo: string
  bandera: string
  /** Sin contar el prefijo. */
  digitos: number
}

export const PAISES: Pais[] = [
  { codigo: 'PE', nombre: 'Perú', prefijo: '+51', bandera: '🇵🇪', digitos: 9 },
  { codigo: 'AR', nombre: 'Argentina', prefijo: '+54', bandera: '🇦🇷', digitos: 10 },
  { codigo: 'BO', nombre: 'Bolivia', prefijo: '+591', bandera: '🇧🇴', digitos: 8 },
  { codigo: 'CL', nombre: 'Chile', prefijo: '+56', bandera: '🇨🇱', digitos: 9 },
  { codigo: 'CO', nombre: 'Colombia', prefijo: '+57', bandera: '🇨🇴', digitos: 10 },
  { codigo: 'CR', nombre: 'Costa Rica', prefijo: '+506', bandera: '🇨🇷', digitos: 8 },
  { codigo: 'EC', nombre: 'Ecuador', prefijo: '+593', bandera: '🇪🇨', digitos: 9 },
  { codigo: 'ES', nombre: 'España', prefijo: '+34', bandera: '🇪🇸', digitos: 9 },
  { codigo: 'GT', nombre: 'Guatemala', prefijo: '+502', bandera: '🇬🇹', digitos: 8 },
  { codigo: 'MX', nombre: 'México', prefijo: '+52', bandera: '🇲🇽', digitos: 10 },
  { codigo: 'PA', nombre: 'Panamá', prefijo: '+507', bandera: '🇵🇦', digitos: 8 },
  { codigo: 'PY', nombre: 'Paraguay', prefijo: '+595', bandera: '🇵🇾', digitos: 9 },
  { codigo: 'US', nombre: 'Estados Unidos', prefijo: '+1', bandera: '🇺🇸', digitos: 10 },
  { codigo: 'UY', nombre: 'Uruguay', prefijo: '+598', bandera: '🇺🇾', digitos: 8 },
  { codigo: 'VE', nombre: 'Venezuela', prefijo: '+58', bandera: '🇻🇪', digitos: 10 },
]

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/** Prefijo y número, para los dos campos. Se prueba del prefijo más
 *  largo al más corto: uno corto puede ser el comienzo de otro. */
export function partirTelefono(valor: string): { prefijo: string; numero: string } {
  const limpio = (valor ?? '').replace(/[\s\-().]/g, '')
  const prefijos = [...PAISES]
    .map((pais) => pais.prefijo)
    .sort((uno, otro) => otro.length - uno.length)

  for (const prefijo of prefijos) {
    if (limpio.startsWith(prefijo)) {
      return { prefijo, numero: limpio.slice(prefijo.length) }
    }
  }
  // Sin país conocido, todo al campo del número: se ve y se corrige
  return { prefijo: PAISES[0]!.prefijo, numero: soloDigitos(limpio) }
}

export function unirTelefono(prefijo: string, numero: string): string {
  const digitos = soloDigitos(numero)
  return digitos ? `${prefijo}${digitos}` : ''
}

/** «+51 987 654 321», solo para mostrar: se guarda sin espacios. */
export function formatearTelefono(valor: string): string {
  const { prefijo, numero } = partirTelefono(valor)
  if (!numero) return ''

  const grupos = numero.match(/.{1,3}/g) ?? [numero]
  return `${prefijo} ${grupos.join(' ')}`
}

/** Si tiene forma de teléfono internacional. No dice que la línea exista:
 *  eso solo lo confirma un mensaje. */
export function telefonoValido(valor: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(valor)
}
