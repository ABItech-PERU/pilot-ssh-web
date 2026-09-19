import { COLORES } from '@/lib/palette'
import type { PaletteColor } from '@/types/api'

/** Una sola letra: dos no se leen a 24 px. */
export function buildInitial(nombre: string): string {
  return (nombre.trim().charAt(0) || '?').toLocaleUpperCase('es')
}

/** «Pizarra», color inicial de un espacio, va como el avatar de persona
 *  (gris del tema, texto apagado): no pasa por color elegido ni por botón.
 *  Los demás, sólidos con inicial blanca. */
export function buildAvatarClasses(color: PaletteColor): string {
  if (color === 'slate') return 'bg-muted text-muted-foreground'
  return `${COLORES[color].solido} text-white`
}
