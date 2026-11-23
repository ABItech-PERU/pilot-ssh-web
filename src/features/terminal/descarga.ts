/** Bajar un archivo del servidor en tramos por el socket de la terminal. */

/** Tramos pedidos por adelantado. Llenan el canal sin que la tecla espere. */
export const VENTANA_DE_DESCARGA = 4

export interface AvanceDeDescarga {
  nombre: string
  recibido: number
  /** Null en una carpeta comprimida, que no sabe su tamaño hasta el final. */
  total: number | null
}

export interface DescargaEnCurso {
  nombre: string
  sumar: (tramo: ArrayBuffer) => void
  avance: () => AvanceDeDescarga
  armar: () => Blob
}

/** El archivo entero queda en memoria hasta guardarlo; por eso hay tope. */
export function crearDescarga(detalle: {
  nombre: string
  tamano: number | null
  ruta: string
}): DescargaEnCurso {
  const partes: ArrayBuffer[] = []
  let recibido = 0

  return {
    nombre: detalle.nombre,
    sumar(tramo) {
      partes.push(tramo)
      recibido += tramo.byteLength
    },
    avance: () => ({ nombre: detalle.nombre, recibido, total: detalle.tamano }),
    armar: () => new Blob(partes),
  }
}

export function fetchPorcentajeDeDescarga({
  recibido,
  total,
}: AvanceDeDescarga): number | null {
  if (total === null) return null
  if (!total) return 100
  return Math.min(100, Math.round((recibido / total) * 100))
}
