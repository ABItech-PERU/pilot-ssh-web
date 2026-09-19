import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type Vista = 'tabla' | 'tarjetas'

const MS_DEBOUNCE_BUSQUEDA = 350

/** Una vista por listado: elegir en uno no decide por los demas. */
function claveDeVista(modulo: string) {
  return `pilotssh.vista.${modulo}`
}

function leerVista(modulo: string, porDefecto: Vista): Vista {
  try {
    const guardada = window.localStorage.getItem(claveDeVista(modulo))
    if (guardada === 'tabla' || guardada === 'tarjetas') return guardada
  } catch {
    // Sin almacenamiento se empieza siempre por la de partida
  }
  return porDefecto
}

interface Opciones<F extends Record<string, string>> {
  /** Tambien son los que restaura "limpiar". */
  filtrosIniciales: F
  /** Con que nombre guarda su vista. Uno por listado. */
  modulo: string
  vistaPorDefecto?: Vista
  /** Cuales cuentan para la insignia del panel avanzado. */
  avanzados?: readonly (keyof F)[]
}

/** Armazon de un listado: filtros, pagina, vista y busqueda con freno.
 *  Los filtros no van a la URL: llenarian el historial de pasos. */
export function useListado<F extends Record<string, string>>({
  filtrosIniciales,
  modulo,
  vistaPorDefecto = 'tarjetas',
  avanzados = [],
}: Opciones<F>) {
  const iniciales = useRef(filtrosIniciales)
  const [filtros, setFiltros] = useState<F>(filtrosIniciales)
  const [pagina, setPagina] = useState(1)
  const [vista, setVistaEstado] = useState<Vista>(() =>
    leerVista(modulo, vistaPorDefecto),
  )

  // Solo la busqueda lleva freno: un selector ya es una decision terminada
  const [busquedaDiferida, setBusquedaDiferida] = useState(filtros.search ?? '')

  useEffect(() => {
    const temporizador = window.setTimeout(
      () => setBusquedaDiferida(filtros.search ?? ''),
      MS_DEBOUNCE_BUSQUEDA,
    )
    return () => window.clearTimeout(temporizador)
  }, [filtros.search])

  const setFiltro = useCallback((clave: keyof F, valor: string) => {
    // Resultados nuevos, desde la primera pagina
    setPagina(1)
    setFiltros((actuales) => ({ ...actuales, [clave]: valor }))
  }, [])

  const limpiarFiltros = useCallback(() => {
    setPagina(1)
    setFiltros(iniciales.current)
    setBusquedaDiferida(iniciales.current.search ?? '')
  }, [])

  const setVista = useCallback(
    (siguiente: Vista) => {
      setVistaEstado(siguiente)
      try {
        window.localStorage.setItem(claveDeVista(modulo), siguiente)
      } catch {
        // Sin almacenamiento la eleccion dura lo que la pestana
      }
    },
    [modulo],
  )

  /** Sin claves en blanco: el backend las tomaria por un valor a buscar. */
  const parametros = useMemo(() => {
    const efectivos = { ...filtros, search: busquedaDiferida } as F
    return Object.fromEntries(
      Object.entries(efectivos).filter(([, valor]) => valor !== ''),
    ) as Partial<F>
  }, [filtros, busquedaDiferida])

  // Contra el valor inicial, no contra vacio: un orden por defecto no es
  // un filtro puesto
  const hayFiltros = Object.keys(filtros).some(
    (clave) => filtros[clave] !== iniciales.current[clave],
  )

  const filtrosAvanzadosActivos = avanzados.filter(
    (clave) => filtros[clave] !== iniciales.current[clave],
  ).length

  return {
    filtros,
    setFiltro,
    limpiarFiltros,
    hayFiltros,
    filtrosAvanzadosActivos,
    parametros,
    pagina,
    setPagina,
    vista,
    setVista,
  }
}
