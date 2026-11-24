/** Rutas del servidor remoto, siempre con «/», sin mirar el sistema local. */

import type { TipoDeEntrada } from '@/features/terminal/socket'
import { formatFileSize } from '@/lib/format'

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
    return {
      accion: 'Borrar carpeta y su contenido',
      detalles: [sinVuelta, 'Se borra con todo lo que tiene dentro.'],
    }
  }
  return { accion: 'Borrar archivo', detalles: [sinVuelta] }
}

/** Lo que el servidor sabe extraer, con `tar` o con `unzip`. */
const COMPRIMIDOS = /.\.(tar\.gz|tar\.bz2|tar\.xz|tgz|tbz2|txz|tar|zip)$/i

export function esComprimido(nombre: string): boolean {
  return COMPRIMIDOS.test(nombre)
}

export interface Medida {
  archivos: number
  carpetas: number
  kb: number
}

const contar = (cuantos: number, uno: string, varios: string) =>
  `${cuantos} ${cuantos === 1 ? uno : varios}`

/** Lo que hay dentro de una carpeta, para decir qué se borra. */
export function describeMedida({ archivos, carpetas, kb }: Medida): string {
  if (!archivos && !carpetas) return 'Está vacía'
  return `${contar(archivos, 'archivo', 'archivos')}, ${contar(carpetas, 'carpeta', 'carpetas')} y ${formatFileSize(kb * 1024)}`
}

/** Con muchos archivos, o sin saber cuántos, un clic no basta para borrar. */
export const ARCHIVOS_PARA_ESCRIBIR_EL_NOMBRE = 100

export function pideEscribirElNombre(medida: Medida | null): boolean {
  return !medida || medida.archivos > ARCHIVOS_PARA_ESCRIBIR_EL_NOMBRE
}

export type CriterioDeOrden = 'nombre' | 'tamano' | 'fecha'
export type Sentido = 'asc' | 'desc'

type Ordenable = {
  nombre: string
  tipo: TipoDeEntrada
  tamano: number
  modificado: string | null
}

/** Carpetas siempre arriba, como en cualquier explorador; luego el criterio. */
export function ordenarEntradas<Entrada extends Ordenable>(
  entradas: Entrada[],
  criterio: CriterioDeOrden,
  sentido: Sentido,
): Entrada[] {
  const signo = sentido === 'asc' ? 1 : -1
  const porNombre = (a: Entrada, b: Entrada) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  const comparar = (a: Entrada, b: Entrada) => {
    if (criterio === 'tamano') return a.tamano - b.tamano
    if (criterio === 'fecha') return (a.modificado ?? '').localeCompare(b.modificado ?? '')
    return porNombre(a, b)
  }
  // Un empate se resuelve por nombre, de la A a la Z en cualquier sentido
  return [...entradas].sort((a, b) => {
    const carpetaA = a.tipo === 'carpeta' ? 0 : 1
    const carpetaB = b.tipo === 'carpeta' ? 0 : 1
    return carpetaA - carpetaB || signo * comparar(a, b) || porNombre(a, b)
  })
}

export function quitarOcultos<Entrada extends { nombre: string }>(entradas: Entrada[]): Entrada[] {
  return entradas.filter((entrada) => !entrada.nombre.startsWith('.'))
}

export interface Acceso {
  leer: boolean
  escribir: boolean
  ejecutar: boolean
}

export interface Cuadricula {
  propietario: Acceso
  grupo: Acceso
  otros: Acceso
}

const QUIENES = ['propietario', 'grupo', 'otros'] as const

/** «rwxr-sr-x» da «755». La s y la t cuentan como ejecutar; la S y la T, no. */
export function fetchOctal(permisos: string): string {
  return QUIENES.map((_, posicion) => {
    const [r, w, x] = permisos.slice(posicion * 3, posicion * 3 + 3)
    return (r === 'r' ? 4 : 0) + (w === 'w' ? 2 : 0) + (x && 'xst'.includes(x) ? 1 : 0)
  }).join('')
}

export function esModoValido(modo: string): boolean {
  return /^[0-7]{3}$/.test(modo)
}

function fetchAcceso(cifra: string): Acceso {
  const valor = Number(cifra)
  return { leer: Boolean(valor & 4), escribir: Boolean(valor & 2), ejecutar: Boolean(valor & 1) }
}

export function fetchCuadricula(modo: string): Cuadricula {
  return {
    propietario: fetchAcceso(modo[0] ?? '0'),
    grupo: fetchAcceso(modo[1] ?? '0'),
    otros: fetchAcceso(modo[2] ?? '0'),
  }
}

export function fetchOctalDeCuadricula(cuadricula: Cuadricula): string {
  return QUIENES.map((quien) => {
    const acceso = cuadricula[quien]
    return (acceso.leer ? 4 : 0) + (acceso.escribir ? 2 : 0) + (acceso.ejecutar ? 1 : 0)
  }).join('')
}

/** «755» da «rwxr-xr-x», como lo muestra `ls -l`. */
export function describePermisos(modo: string): string {
  return [...modo]
    .map((cifra) => {
      const valor = Number(cifra)
      return `${valor & 4 ? 'r' : '-'}${valor & 2 ? 'w' : '-'}${valor & 1 ? 'x' : '-'}`
    })
    .join('')
}

export type FinDeLinea = '\n' | '\r\n'

export function fetchFinDeLinea(texto: string): FinDeLinea {
  return texto.includes('\r\n') ? '\r\n' : '\n'
}

/** El navegador deja solo «\n»; un archivo de Windows vuelve a «\r\n». */
export function aplicarFinDeLinea(texto: string, fin: FinDeLinea): string {
  const unificado = texto.replace(/\r\n/g, '\n')
  return fin === '\n' ? unificado : unificado.replace(/\n/g, '\r\n')
}
