import { useState } from 'react'

import {
  alternarColumna,
  columnasPorDefecto,
  sanear,
  type MetaDeColumna,
} from '@/lib/columnas'

function claveDe(modulo: string) {
  return `pilotssh.columnas.${modulo}`
}

function leer(modulo: string, columnas: MetaDeColumna[]): string[] | null {
  try {
    const guardado = window.localStorage.getItem(claveDe(modulo))
    return guardado ? sanear(JSON.parse(guardado), columnas) : null
  } catch {
    return null
  }
}

function guardar(modulo: string, visibles: string[]) {
  try {
    window.localStorage.setItem(claveDe(modulo), JSON.stringify(visibles))
  } catch {
    // Sin almacenamiento la eleccion dura lo que la pestana
  }
}

/** Columnas visibles de un listado. Se guardan en el navegador, por módulo. */
export function useColumnas<C extends MetaDeColumna>(modulo: string, columnas: C[]) {
  const [visibles, setVisibles] = useState<string[]>(
    () => leer(modulo, columnas) ?? columnasPorDefecto(columnas),
  )

  /** Devuelve la que se escondió para hacer sitio, si hizo falta. */
  const alternar = (key: string): string | null => {
    const resultado = alternarColumna(visibles, key, columnas)
    setVisibles(resultado.visibles)
    guardar(modulo, resultado.visibles)
    return resultado.ocultada
  }

  const restablecer = () => {
    const iniciales = columnasPorDefecto(columnas)
    setVisibles(iniciales)
    guardar(modulo, iniciales)
  }

  return {
    visibles,
    elegidas: columnas.filter((columna) => visibles.includes(columna.key)),
    alternar,
    restablecer,
  }
}
