/** Cómo ve cada persona los archivos. Vive en su navegador. */

import type { CriterioDeOrden, Sentido } from '@/features/terminal/archivos'

const CLAVE = 'pilotssh.archivos.vista'

export interface VistaDeArchivos {
  orden: CriterioDeOrden
  sentido: Sentido
  ocultos: boolean
}

/** Los ocultos se ven, porque `.env` y `.htaccess` es lo que se viene a tocar. */
export const VISTA_INICIAL: VistaDeArchivos = { orden: 'nombre', sentido: 'asc', ocultos: true }

export function leerVista(): VistaDeArchivos {
  try {
    const guardada = JSON.parse(window.localStorage.getItem(CLAVE) ?? '{}') as Partial<VistaDeArchivos>
    return {
      orden: ['nombre', 'tamano', 'fecha'].includes(guardada.orden ?? '')
        ? (guardada.orden as CriterioDeOrden)
        : VISTA_INICIAL.orden,
      sentido: guardada.sentido === 'desc' ? 'desc' : 'asc',
      ocultos: guardada.ocultos ?? VISTA_INICIAL.ocultos,
    }
  } catch {
    return VISTA_INICIAL
  }
}

export function guardarVista(vista: VistaDeArchivos) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(vista))
  } catch {
    // Sin almacenamiento, la vista vuelve a la inicial al recargar
  }
}
