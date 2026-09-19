import { formatCredits, formatDate } from '@/lib/format'
import type { TopUpPackage, Wallet, WalletState } from '@/types/api'

export type Tono = 'normal' | 'aviso' | 'peligro'

/** Dos palabras para la insignia junto al saldo. */
export function describirEstado(estado: WalletState): { etiqueta: string; tono: Tono } {
  switch (estado) {
    case 'low':
      return { etiqueta: 'Queda poco', tono: 'aviso' }
    case 'grace':
      return { etiqueta: 'En margen', tono: 'peligro' }
    case 'exhausted':
      return { etiqueta: 'Agotado', tono: 'peligro' }
    case 'empty':
      return { etiqueta: 'Sin créditos', tono: 'normal' }
    default:
      return { etiqueta: 'Con saldo', tono: 'normal' }
  }
}

const SIN_GRATUITO =
  'Sin créditos. Lo gratuito de cada día empieza al confirmar el correo de la cuenta propietaria.'

/** El saldo en una línea, igual en la página y en el aviso superior. */
export function describirSaldo(saldo: Wallet): { detalle: string; tono: Tono } {
  switch (saldo.state) {
    case 'grace':
      return {
        detalle: saldo.grace_ends_at
          ? `Sin créditos. Las terminales siguen abriéndose hasta el ${formatDate(saldo.grace_ends_at)}.`
          : 'Sin créditos. Las terminales siguen abriéndose unos días más.',
        tono: 'peligro',
      }
    case 'exhausted':
      return {
        detalle: saldo.has_free_allowance
          ? 'Sin créditos. Solo se abren las terminales gratuitas de cada día.'
          : SIN_GRATUITO,
        tono: 'peligro',
      }
    // Nunca tuvo créditos: vive de lo gratuito, sin cortes
    case 'empty':
      return {
        detalle: saldo.has_free_allowance
          ? 'Solo se abren las terminales gratuitas de cada día.'
          : SIN_GRATUITO,
        tono: 'normal',
      }
    case 'low':
      return {
        detalle: `${describirDuracion(saldo.days_left)} Recargue pronto.`,
        tono: 'aviso',
      }
    default:
      return {
        detalle:
          saldo.days_left === null
            ? 'Sin gasto en el último mes.'
            : describirDuracion(saldo.days_left),
        tono: 'normal',
      }
  }
}

/** Menos de un día no se redondea a «0 días»: parecería agotado. */
function describirDuracion(dias: number | null): string {
  if (dias === null || dias < 1) return 'Le alcanza para menos de un día.'
  if (dias === 1) return 'Le alcanza para un día.'
  return `Le alcanza para ${describirPlazo(dias)}.`
}

/** Plazos largos en meses o años, no «1031 días». */
function describirPlazo(dias: number): string {
  if (dias < 60) return `unos ${dias} días`
  if (dias < 730) return `unos ${Math.round(dias / 30)} meses`
  return `unos ${Math.floor(dias / 365)} años`
}

/** Nombre para la ficha, sin el precio que ya va al otro extremo. */
export function etiquetaDelPaquete(paquete: TopUpPackage): string {
  const importe = String(Number(paquete.price_amount))
  const limpio = paquete.name
    .split(' ')
    .filter((parte) => parte !== 'S/' && parte !== importe)
    .join(' ')
    .trim()
  return limpio || 'Recarga'
}

/** Total con regalo, su desglose, el regalo en porcentaje y la duración
 *  al ritmo actual. */
export function explicarPaquete(
  paquete: TopUpPackage,
  gastoDiario: number,
): {
  total: string
  desglose: string | null
  regalo: string | null
  duracion: string | null
  hasta: string | null
} {
  const regalo = Number(paquete.bonus_credits)
  const porcentaje = regalo > 0 ? Math.round((regalo / Number(paquete.credits)) * 100) : 0
  const dias =
    gastoDiario > 0
      ? Math.max(1, Math.floor(Number(paquete.total_credits) / gastoDiario))
      : 0

  return {
    total: `${formatCredits(paquete.total_credits)} créditos en total`,
    desglose:
      regalo > 0
        ? `${formatCredits(paquete.credits)} del paquete + ${formatCredits(regalo)} de regalo`
        : null,
    regalo: porcentaje > 0 ? `+${porcentaje} % de regalo` : null,
    duracion: dias > 0 ? `Le dura ${describirPlazo(dias)} a su ritmo` : null,
    // Solo con fecha límite: sin ella no hay urgencia que anunciar
    hasta: paquete.available_until
      ? `Solo hasta el ${formatDate(paquete.available_until)}`
      : null,
  }
}

/** Más créditos por sol. Null si empatan o hay uno solo. */
export function mejorPrecio(paquetes: TopUpPackage[]): string | null {
  if (paquetes.length < 2) return null
  const porSol = paquetes.map((paquete) => ({
    id: paquete.id,
    valor: Number(paquete.total_credits) / Number(paquete.price_amount),
  }))
  const mejor = Math.max(...porSol.map((fila) => fila.valor))
  const ganadores = porSol.filter((fila) => fila.valor === mejor)
  return ganadores.length === 1 ? ganadores[0]!.id : null
}

/** Elegido al abrir: el marcado por finanzas o el primero con regalo. */
export function paqueteRecomendado(paquetes: TopUpPackage[]): TopUpPackage | undefined {
  return (
    paquetes.find((paquete) => paquete.is_recommended) ??
    paquetes.find((paquete) => Number(paquete.bonus_credits) > 0) ??
    paquetes[0]
  )
}
