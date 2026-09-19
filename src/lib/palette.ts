import type { PaletteColor } from '@/types/api'

/** Paleta del avatar de organización y de las opciones de etiqueta. Dos
 *  tonos por color, uno por tema.
 *
 *  El orden es el del reparto automático del backend: alterna tonos
 *  opuestos para que opciones seguidas no se parezcan.
 *
 *  Este rojo no es el del sistema, que significa «destructivo». */
export const COLORES: Record<
  PaletteColor,
  { etiqueta: string; solido: string; relleno: string }
> = {
  blue: {
    etiqueta: 'Azul',
    solido: 'bg-blue-600 dark:bg-blue-500',
    relleno: 'bg-blue-600 text-white',
  },
  amber: {
    etiqueta: 'Ámbar',
    solido: 'bg-amber-600 dark:bg-amber-500',
    relleno: 'bg-amber-500 text-amber-950',
  },
  violet: {
    etiqueta: 'Violeta',
    solido: 'bg-violet-600 dark:bg-violet-500',
    relleno: 'bg-violet-600 text-white',
  },
  green: {
    etiqueta: 'Verde',
    solido: 'bg-green-600 dark:bg-green-500',
    relleno: 'bg-green-700 text-white',
  },
  red: {
    etiqueta: 'Rojo',
    solido: 'bg-red-600 dark:bg-red-500',
    relleno: 'bg-red-600 text-white',
  },
  indigo: {
    etiqueta: 'Índigo',
    solido: 'bg-indigo-600 dark:bg-indigo-500',
    relleno: 'bg-indigo-600 text-white',
  },
  pink: {
    etiqueta: 'Rosa',
    solido: 'bg-pink-600 dark:bg-pink-500',
    relleno: 'bg-pink-600 text-white',
  },
  slate: {
    etiqueta: 'Pizarra',
    solido: 'bg-slate-600 dark:bg-slate-500',
    relleno: 'bg-slate-700 text-slate-100',
  },
  teal: {
    etiqueta: 'Verde azulado',
    solido: 'bg-teal-600 dark:bg-teal-500',
    relleno: 'bg-teal-700 text-white',
  },
}

export const NOMBRES = Object.keys(COLORES) as PaletteColor[]

/** Para lo que no trae color: nada queda invisible. */
export const COLOR_POR_DEFECTO: PaletteColor = 'slate'

export function resolveColor(color: string | undefined): PaletteColor {
  return color && color in COLORES ? (color as PaletteColor) : COLOR_POR_DEFECTO
}
