import { LaptopIcon, SmartphoneIcon } from 'lucide-react'

const MOVILES = ['iPhone', 'iPad', 'Android']

/** Móvil o portátil: se reconoce antes de leer el nombre. */
export function iconoDeEquipo(equipo: string): React.ElementType {
  return MOVILES.some((movil) => equipo.includes(movil)) ? SmartphoneIcon : LaptopIcon
}
