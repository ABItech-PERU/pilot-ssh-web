import { useCallback, useState } from 'react'

const CLAVE = 'pilotssh.barra'

function leerColapsada(): boolean {
  try {
    return window.localStorage.getItem(CLAVE) === 'colapsada'
  } catch {
    return false
  }
}

/** Preferencia del equipo, no de la sesión: persiste entre sesiones. */
export function useSidebar() {
  const [colapsada, setColapsada] = useState(leerColapsada)

  const alternar = useCallback(() => {
    setColapsada((actual) => {
      const siguiente = !actual
      try {
        window.localStorage.setItem(CLAVE, siguiente ? 'colapsada' : 'abierta')
      } catch {
        // Sin almacenamiento, la elección dura lo que la pestaña
      }
      return siguiente
    })
  }, [])

  return { colapsada, alternar }
}
