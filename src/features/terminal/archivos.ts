/** Rutas del servidor remoto, siempre con «/», sin mirar el sistema local. */

import type { TipoDeEntrada } from '@/features/terminal/socket'

export interface Miga {
  nombre: string
  ruta: string
}

/** Cada carpeta de la ruta, para volver a ella de un clic. */
export function fetchMigas(ruta: string): Miga[] {
  const tramos = ruta.split('/').filter(Boolean)
  return tramos.map((nombre, posicion) => ({
    nombre,
    ruta: `/${tramos.slice(0, posicion + 1).join('/')}`,
  }))
}

export function joinRuta(carpeta: string, nombre: string): string {
  return `${carpeta === '/' ? '' : carpeta}/${nombre}`
}

/** Compara «canción» con «cancion», porque quien busca no teclea tildes. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Lo que coincide con lo que se busca, en el mismo orden. */
export function filtrarEntradas<Entrada extends { nombre: string }>(
  entradas: Entrada[],
  texto: string,
): Entrada[] {
  const buscado = normalizar(texto.trim())
  if (!buscado) return entradas
  return entradas.filter((entrada) => normalizar(entrada.nombre).includes(buscado))
}

/** El botón dice qué se borra y la caja «Qué pasa», lo que no tiene vuelta. */
export function describeBorrado(tipo: TipoDeEntrada): { accion: string; detalles: string[] } {
  if (tipo === 'enlace') {
    return {
      accion: 'Borrar enlace',
      detalles: ['Se borra solo el enlace. Su destino sigue igual.'],
    }
  }
  const sinVuelta = 'Se borra del servidor. No hay papelera para recuperarlo.'
  if (tipo === 'carpeta') {
    return { accion: 'Borrar carpeta', detalles: [sinVuelta, 'Solo se borra si está vacía.'] }
  }
  return { accion: 'Borrar archivo', detalles: [sinVuelta] }
}
