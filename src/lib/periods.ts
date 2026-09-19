import { diaEnZona, zonaActual } from '@/lib/zona-horaria'

/** Un rango de días, tal como viaja a la API: `AAAA-MM-DD`. */
export interface Rango {
  from: string
  to: string
}

export type Periodo =
  | 'hoy'
  | 'ayer'
  | 'semana'
  | 'mes'
  | 'mes-anterior'
  | 'seis-meses'
  | 'ano'
  | 'ano-pasado'
  | 'personalizado'

export const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'ayer', etiqueta: 'Ayer' },
  { valor: 'semana', etiqueta: 'Esta semana' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'mes-anterior', etiqueta: 'Mes anterior' },
  { valor: 'seis-meses', etiqueta: 'Últimos 6 meses' },
  { valor: 'ano', etiqueta: 'Este año' },
  { valor: 'ano-pasado', etiqueta: 'Año pasado' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
]

/** El día en la zona de quien mira, no en UTC: a las 21:00 en Lima,
 *  `toISOString()` ya da el día siguiente. */
export function formatearDia(fecha: Date): string {
  return diaEnZona(fecha, zonaActual())
}

/** Un día del calendario con la cuenta hecha en UTC: sumar días a una
 *  medianoche local se tuerce el día que cambia la hora. */
function diaDe(ano: number, indiceMes: number, dia: number): string {
  return new Date(Date.UTC(ano, indiceMes, dia)).toISOString().slice(0, 10)
}

export function sumarDias(dia: string, dias: number): string {
  const [ano, mes, numero] = dia.split('-').map(Number) as [number, number, number]
  return diaDe(ano, mes - 1, numero + dias)
}

/** El rango de cada atajo. Null en «Personalizado»: lo escribe quien
 *  lo elige. */
export function resolverPeriodo(periodo: Periodo, hoy = new Date()): Rango | null {
  const [ano, mes, dia] = formatearDia(hoy).split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const indiceMes = mes - 1
  const deHoy = diaDe(ano, indiceMes, dia)

  switch (periodo) {
    case 'hoy':
      return { from: deHoy, to: deHoy }
    case 'ayer':
      return { from: diaDe(ano, indiceMes, dia - 1), to: diaDe(ano, indiceMes, dia - 1) }
    case 'semana': {
      // La semana empieza el lunes: el domingo es su final, no su principio
      const diaDeLaSemana = new Date(Date.UTC(ano, indiceMes, dia)).getUTCDay()
      return { from: diaDe(ano, indiceMes, dia - ((diaDeLaSemana + 6) % 7)), to: deHoy }
    }
    case 'mes':
      return { from: diaDe(ano, indiceMes, 1), to: deHoy }
    case 'mes-anterior':
      return { from: diaDe(ano, indiceMes - 1, 1), to: diaDe(ano, indiceMes, 0) }
    case 'seis-meses':
      return { from: diaDe(ano, indiceMes - 6, dia), to: deHoy }
    case 'ano':
      return { from: diaDe(ano, 0, 1), to: deHoy }
    case 'ano-pasado':
      return { from: diaDe(ano - 1, 0, 1), to: diaDe(ano - 1, 11, 31) }
    case 'personalizado':
      return null
  }
}
