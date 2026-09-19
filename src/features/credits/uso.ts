import { formatCredits, formatDay, formatMonth } from '@/lib/format'
import { sumarDias, type Rango } from '@/lib/periods'
import { diaEnZona } from '@/lib/zona-horaria'
import type { DailyUsage } from '@/types/api'

export const DIAS_DEL_GRAFICO = 30

/** Hasta aquí, una barra por día; más allá, por mes. */
const DIAS_QUE_CABEN = 92

export interface DiaDeUso {
  fecha: string
  creditos: number
  personas: number
  servidores: number
  /** Hubo terminales, aunque fueran gratuitas. */
  usado: boolean
}

/** Un día o un mes entero. */
export interface BarraDeUso {
  clave: string
  /** Para el globo y el lector de pantalla. */
  etiqueta: string
  creditos: number
  usado: boolean
}

export interface SerieDeUso {
  barras: BarraDeUso[]
  /** Extremos del eje, ya formateados. */
  desde: string
  hasta: string
}

/** Días hasta ayer, con o sin uso: un hueco dice tanto como una barra.
 *  Hoy no entra: aún no se cobró. */
export function construirSerie(
  uso: DailyUsage[],
  hoy: Date,
  zona: string,
  dias = DIAS_DEL_GRAFICO,
): DiaDeUso[] {
  // Hoy en la zona de cobro: con otra, cerca de medianoche la barra caería
  // en otro día
  const deHoy = diaEnZona(hoy, zona)
  return diasEntre(uso, sumarDias(deHoy, -dias), sumarDias(deHoy, -1))
}

function diasEntre(uso: DailyUsage[], desde: string, hasta: string): DiaDeUso[] {
  const porFecha = new Map(uso.map((fila) => [fila.usage_date, fila]))
  const dias: DiaDeUso[] = []
  for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    const fila = porFecha.get(fecha)
    dias.push({
      fecha,
      creditos: Number(fila?.credits_charged ?? 0),
      personas: fila?.members_used ?? 0,
      servidores: fila?.servers_used ?? 0,
      usado: fila !== undefined,
    })
  }
  return dias
}

export function serieDelUltimoMes(
  uso: DailyUsage[],
  hoy: Date,
  zona: string,
): SerieDeUso {
  return serieDeDias(construirSerie(uso, hoy, zona))
}

/** Un rango abierto va del primer día con uso hasta ayer. Pasados tres
 *  meses, las barras son meses. */
export function construirSerieDelRango(
  uso: DailyUsage[],
  rango: Rango,
  hoy: Date,
  zona: string,
): SerieDeUso {
  const ayer = sumarDias(diaEnZona(hoy, zona), -1)
  const primero = uso.map((fila) => fila.usage_date).sort()[0]
  const desde = rango.from || primero || ayer
  const hasta = rango.to || ayer
  if (hasta < desde)
    return { barras: [], desde: formatDay(desde), hasta: formatDay(hasta) }

  const dias = diasEntre(uso, desde, hasta)
  return dias.length <= DIAS_QUE_CABEN ? serieDeDias(dias) : serieDeMeses(dias)
}

function serieDeDias(dias: DiaDeUso[]): SerieDeUso {
  return {
    barras: dias.map((dia) => ({
      clave: dia.fecha,
      etiqueta: describirDia(dia),
      creditos: dia.creditos,
      usado: dia.usado,
    })),
    desde: formatDay(dias[0]?.fecha ?? ''),
    hasta: formatDay(dias.at(-1)?.fecha ?? ''),
  }
}

function serieDeMeses(dias: DiaDeUso[]): SerieDeUso {
  const meses = new Map<string, { creditos: number; conUso: number }>()
  for (const dia of dias) {
    const mes = dia.fecha.slice(0, 7)
    const acumulado = meses.get(mes) ?? { creditos: 0, conUso: 0 }
    acumulado.creditos += dia.creditos
    acumulado.conUso += dia.usado ? 1 : 0
    meses.set(mes, acumulado)
  }

  return {
    barras: Array.from(meses, ([mes, { creditos, conUso }]) => ({
      clave: mes,
      etiqueta: describirMes(mes, conUso, creditos),
      creditos,
      usado: conUso > 0,
    })),
    desde: formatMonth(dias[0]?.fecha ?? ''),
    hasta: formatMonth(dias.at(-1)?.fecha ?? ''),
  }
}

export function resumirMes(
  uso: DailyUsage[],
  hoy: Date,
  zona: string,
): { creditos: number; dias: number } {
  const mes = diaEnZona(hoy, zona).slice(0, 7)
  const delMes = uso.filter((fila) => fila.usage_date.startsWith(mes))
  return {
    creditos: delMes.reduce((total, fila) => total + Number(fila.credits_charged), 0),
    dias: delMes.length,
  }
}

export function contar(cuantos: number, uno: string, varios: string): string {
  return `${cuantos} ${cuantos === 1 ? uno : varios}`
}

/** Globo de la barra: quién, cuántos servidores y lo que costó. */
export function describirDia(dia: DiaDeUso): string {
  const fecha = formatDay(dia.fecha)
  if (!dia.usado) return `${fecha}: sin uso`

  const quien = `${contar(dia.personas, 'persona', 'personas')} y ${contar(dia.servidores, 'servidor', 'servidores')}`
  return `${fecha}: ${quien} · ${describirCoste(dia.creditos)}`
}

function describirMes(mes: string, conUso: number, creditos: number): string {
  const nombre = formatMonth(`${mes}-01`)
  if (conUso === 0) return `${nombre}: sin uso`
  return `${nombre}: ${contar(conUso, 'día con uso', 'días con uso')} · ${describirCoste(creditos)}`
}

/** Lo gratuito se dice «gratis», no «0 créditos». */
export function describirCoste(creditos: number): string {
  return creditos > 0 ? `${formatCredits(creditos)} créditos` : 'gratis'
}
