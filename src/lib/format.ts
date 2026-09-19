import { zonaActual } from '@/lib/zona-horaria'

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

const SEMANA = 7 * 24 * 3600

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto', style: 'short' })

interface Formatos {
  diaYMes: Intl.DateTimeFormat
  diaMesYAno: Intl.DateTimeFormat
  absoluto: Intl.DateTimeFormat
  ano: Intl.DateTimeFormat
}

const formatosPorZona = new Map<string, Formatos>()

/** Los de la zona de quien mira, uno por zona: crear un formateador cuesta. */
function formatos(): Formatos {
  const timeZone = zonaActual()
  let hechos = formatosPorZona.get(timeZone)
  if (!hechos) {
    hechos = {
      diaYMes: new Intl.DateTimeFormat('es', {
        timeZone,
        day: 'numeric',
        month: 'short',
      }),
      diaMesYAno: new Intl.DateTimeFormat('es', {
        timeZone,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      absoluto: new Intl.DateTimeFormat('es', {
        timeZone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      ano: new Intl.DateTimeFormat('es', { timeZone, year: 'numeric' }),
    }
    formatosPorZona.set(timeZone, hechos)
  }
  return hechos
}

// Un día del calendario no es un instante: se lee y se escribe en UTC, y
// ninguna zona lo corre al anterior
const diaSinZona = new Intl.DateTimeFormat('es', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})

/** Como el "Nunca" que comparte columna. */
function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1)
}

/** "Hace 7 min", "Ayer"; pasada una semana, "12 mar". El dato exacto lo
 *  da `formatDateTime`. */
export function formatRelative(iso: string | null): string {
  if (!iso) return 'Nunca'

  const fecha = new Date(iso)
  const segundos = (fecha.getTime() - Date.now()) / 1000
  const distancia = Math.abs(segundos)

  if (distancia >= SEMANA) {
    const { ano, diaYMes, diaMesYAno } = formatos()
    return ano.format(fecha) === ano.format(new Date())
      ? diaYMes.format(fecha)
      : diaMesYAno.format(fecha)
  }

  for (const [unidad, tamano] of UNIDADES) {
    if (distancia >= tamano) {
      return conMayusculaInicial(relativo.format(Math.round(segundos / tamano), unidad))
    }
  }
  return 'Ahora'
}

/** Una fecha suelta, como la de una caducidad: "12 mar 2027". */
export function formatDate(iso: string): string {
  return formatos().diaMesYAno.format(new Date(iso))
}

export function formatDateTime(iso: string | null): string {
  return iso ? formatos().absoluto.format(new Date(iso)) : 'Nunca'
}

export function formatCredits(amount: string | number): string {
  const numero = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(numero)) return '0'
  return new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(numero)
}

const SIMBOLOS_DE_MONEDA: Record<string, string> = { PEN: 'S/', USD: 'US$' }

/** «S/ 50», como en un recibo. Céntimos solo si los hay. */
export function formatPrice(amount: string, currency: string): string {
  const numero = Number(amount)
  const decimales = Number.isInteger(numero) ? 0 : 2
  const cifra = new Intl.NumberFormat('es', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero)
  return `${SIMBOLOS_DE_MONEDA[currency] ?? currency} ${cifra}`
}

/** Un día del calendario: «12 mar». Ninguna zona lo corre al anterior. */
export function formatDay(fecha: string): string {
  return diaSinZona.format(new Date(`${fecha}T12:00:00Z`))
}

const mesSinZona = new Intl.DateTimeFormat('es', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
})

/** El mes de un día: «mar 2026». */
export function formatMonth(fecha: string): string {
  return mesSinZona.format(new Date(`${fecha}T12:00:00Z`))
}

/** El peso de un archivo como se lee: «245 KB», «1,2 MB». */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`

  return `${new Intl.NumberFormat('es', { maximumFractionDigits: 1 }).format(kb / 1024)} MB`
}

/** Iniciales para el avatar: primera y última palabra; con una sola, sus
 *  dos primeras letras. */
export function buildInitials(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return '?'

  const primera = palabras[0]!.charAt(0)
  const ultima = palabras.length > 1 ? palabras.at(-1)!.charAt(0) : palabras[0]!.charAt(1)

  return (primera + (ultima ?? '')).toLocaleUpperCase('es')
}

/** «2h 15m», «7m 30s», «45s». Con horas no se muestran segundos. */
export function formatSeconds(segundos: number): string {
  if (segundos < 60) return `${segundos}s`

  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  if (horas > 0) return `${horas}h ${minutos}m`

  const resto = segundos % 60
  return resto > 0 ? `${minutos}m ${resto}s` : `${minutos}m`
}
