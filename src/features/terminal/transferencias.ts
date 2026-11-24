/** La cola de subidas, con su avance, velocidad y tiempo restante. */

import { joinRuta } from '@/features/terminal/archivos'

export type EstadoDeTransferencia =
  'en-cola' | 'subiendo' | 'lista' | 'error' | 'cancelada' | 'omitida'

export interface Transferencia {
  id: number
  archivo: File
  /** Lo que se muestra; en una carpeta subida, su ruta dentro de ella. */
  nombre: string
  carpeta: string
  /** Al subir una carpeta, sus subcarpetas se crean en el servidor. */
  crearCarpeta: boolean
  estado: EstadoDeTransferencia
  enviado: number
  total: number
  /** Bytes por segundo; null hasta tener con qué medirla. */
  velocidad: number | null
  /** La del servidor, ya resuelta, al terminar. */
  ruta?: string
  motivo?: string
}

export interface Muestra {
  instante: number
  enviado: number
}

/** Se mide sobre los últimos segundos, como un gestor de descargas. */
const VENTANA_DE_VELOCIDAD_MS = 3000

export function calcularVelocidad(muestras: Muestra[]): number | null {
  const ultima = muestras.at(-1)
  if (!ultima) return null
  const desde = ultima.instante - VENTANA_DE_VELOCIDAD_MS
  const primera = muestras.find((muestra) => muestra.instante >= desde)
  if (!primera || primera === ultima) return null
  return (
    ((ultima.enviado - primera.enviado) * 1000) / (ultima.instante - primera.instante)
  )
}

/** Segundos que faltan; null sin velocidad para estimarlo. */
export function estimarRestante(
  total: number,
  enviado: number,
  velocidad: number | null,
): number | null {
  if (!velocidad) return null
  return Math.max(0, total - enviado) / velocidad
}

export function describirRestante(segundos: number): string {
  if (segundos < 60) return `quedan ${Math.ceil(segundos)} s`
  if (segundos < 3600) return `quedan ${Math.ceil(segundos / 60)} min`
  const horas = new Intl.NumberFormat('es', { maximumFractionDigits: 1 }).format(
    segundos / 3600,
  )
  return `quedan ${horas} h`
}

export interface ArchivoParaSubir {
  archivo: File
  carpeta: string
  nombre: string
  crearCarpeta: boolean
}

/** Cada archivo a su carpeta. Lo que viene dentro de una carpeta soltada
 *  conserva su estructura, y sus subcarpetas se crean. */
export function planearSubida(
  destino: string,
  soltados: { archivo: File; relativa: string }[],
): ArchivoParaSubir[] {
  return soltados.map(({ archivo, relativa }) => {
    const corte = relativa.lastIndexOf('/')
    const dentro = corte > 0 ? relativa.slice(0, corte) : ''
    return {
      archivo,
      carpeta: dentro ? joinRuta(destino, dentro) : destino,
      nombre: relativa,
      crearCarpeta: Boolean(dentro),
    }
  })
}

const ACTIVAS: EstadoDeTransferencia[] = ['en-cola', 'subiendo']
const SIN_DESCONTAR: EstadoDeTransferencia[] = ['error', 'cancelada', 'omitida']

/** Lo que dice la cabecera del panel, de todas a la vez. */
export function resumirTransferencias(lista: Transferencia[]) {
  const activas = lista.filter((una) => ACTIVAS.includes(una.estado))
  const cuentan = lista.filter((una) => !SIN_DESCONTAR.includes(una.estado))
  const total = cuentan.reduce((suma, una) => suma + una.total, 0)
  const enviado = cuentan.reduce((suma, una) => suma + una.enviado, 0)
  const velocidad = lista.find((una) => una.estado === 'subiendo')?.velocidad ?? null
  const pendiente = activas.reduce((suma, una) => suma + (una.total - una.enviado), 0)
  return {
    activas: activas.length,
    hechas: lista.filter((una) => una.estado === 'lista').length,
    fallidas: lista.filter((una) => una.estado === 'error').length,
    total: lista.length,
    porcentaje: total ? Math.round((enviado / total) * 100) : 100,
    velocidad,
    restante: activas.length ? estimarRestante(pendiente, 0, velocidad) : null,
  }
}
