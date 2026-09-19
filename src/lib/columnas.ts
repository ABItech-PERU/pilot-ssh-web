/** Columnas visibles de una tabla, a elección de quien mira. El tope es
 *  lo que cabe en una pantalla lg; al pasarlo se oculta la menos importante. */

export const MAXIMO_DE_COLUMNAS = 9

export interface MetaDeColumna {
  key: string
  header: string
  /** Siempre a la vista: la identidad de la fila y sus acciones. */
  fija?: boolean
  /** `false`: escondida hasta que alguien la pida desde «Columnas». */
  porDefecto?: boolean
  /** Cuál se oculta primero al pasarse del tope: la de número más alto. */
  prioridad?: number
}

const PRIORIDAD_NORMAL = 50

export function columnasPorDefecto(columnas: MetaDeColumna[]): string[] {
  return columnas
    .filter((columna) => columna.fija || columna.porDefecto !== false)
    .map((columna) => columna.key)
}

export interface Alternancia {
  visibles: string[]
  /** La que se escondió para hacer sitio, si hizo falta. */
  ocultada: string | null
}

export function alternarColumna(
  visibles: string[],
  key: string,
  columnas: MetaDeColumna[],
): Alternancia {
  const columna = columnas.find((cada) => cada.key === key)
  if (!columna || columna.fija) return { visibles, ocultada: null }

  if (visibles.includes(key)) {
    return { visibles: visibles.filter((cada) => cada !== key), ocultada: null }
  }

  let siguientes = [...visibles, key]
  let ocultada: string | null = null
  if (siguientes.length > MAXIMO_DE_COLUMNAS) {
    // Entre las que se pueden esconder, la de menos prioridad; a igual
    // prioridad, la de más a la derecha, que es la que menos se lee
    const prescindibles = columnas.filter(
      (cada) => !cada.fija && cada.key !== key && siguientes.includes(cada.key),
    )
    const sobrante = prescindibles.reduce((peor, cada) =>
      prioridadDe(cada) >= prioridadDe(peor) ? cada : peor,
    )
    ocultada = sobrante.key
    siguientes = siguientes.filter((cada) => cada !== ocultada)
  }

  return { visibles: ordenar(siguientes, columnas), ocultada }
}

/** En el orden del catálogo: elegir una columna no la manda al final. */
export function ordenar(visibles: string[], columnas: MetaDeColumna[]): string[] {
  return columnas.filter((cada) => visibles.includes(cada.key)).map((cada) => cada.key)
}

/** Lo guardado solo vale si nombra columnas que existen; las fijas entran
 *  aunque no estén, y nunca más del tope. Null si no hay nada que valga. */
export function sanear(guardadas: unknown, columnas: MetaDeColumna[]): string[] | null {
  if (!Array.isArray(guardadas)) return null

  const conocidas = guardadas.filter(
    (cada): cada is string =>
      typeof cada === 'string' && columnas.some((columna) => columna.key === cada),
  )
  if (conocidas.length === 0) return null

  const fijas = columnas.filter((cada) => cada.fija).map((cada) => cada.key)
  return ordenar([...new Set([...fijas, ...conocidas])], columnas).slice(
    0,
    MAXIMO_DE_COLUMNAS,
  )
}

function prioridadDe(columna: MetaDeColumna): number {
  return columna.prioridad ?? PRIORIDAD_NORMAL
}
