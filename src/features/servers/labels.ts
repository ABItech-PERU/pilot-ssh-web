import { resolveColor } from '@/lib/palette'
import type { LabelDefinition, PaletteColor } from '@/types/api'

/** Color de cada pareja. La etiqueta puesta es solo texto; el color vive
 *  en el catálogo de la organización. */
export function buildLabelColors(
  definiciones: LabelDefinition[],
): Record<string, PaletteColor> {
  const colores: Record<string, PaletteColor> = {}

  for (const definicion of definiciones) {
    for (const valor of definicion.values) {
      colores[`${definicion.key}:${valor}`] = resolveColor(definicion.colors[valor])
    }
  }
  return colores
}

/** `clave:valor` → «clave: valor». El nombre no admite «:»: corta en el
 *  primero. */
export function describirEtiqueta(pareja: string) {
  const corte = pareja.indexOf(':')
  if (corte === -1) return pareja
  return `${pareja.slice(0, corte)}: ${pareja.slice(corte + 1)}`
}

/** De `{Entorno: ['Producción', 'Pruebas']}` a una opción por pareja, con
 *  el valor `clave:valor` de la consulta. */
export function buildLabelOptions(labels: Record<string, string[]>) {
  const opciones = [{ valor: 'todas', etiqueta: 'Todas las etiquetas' }]

  for (const [clave, valores] of Object.entries(labels)) {
    for (const valor of valores) {
      const pareja = `${clave}:${valor}`
      opciones.push({ valor: pareja, etiqueta: describirEtiqueta(pareja) })
    }
  }
  return opciones
}

/** Servidores y credenciales juntos: decide si hay enlace y si se puede
 *  quitar. */
export function contarUso(fila?: { servers: number; credentials: number }) {
  if (!fila) return 0
  return fila.servers + fila.credentials
}

/** «2 servidores y 1 credencial», omite las partes en cero. */
export function describirUso(fila?: { servers: number; credentials: number }) {
  const partes = [
    contarPlural(fila?.servers ?? 0, 'servidor', 'servidores'),
    contarPlural(fila?.credentials ?? 0, 'credencial', 'credenciales'),
  ].filter(Boolean)

  return partes.length > 0 ? partes.join(' y ') : 'Sin asignar'
}

function contarPlural(total: number, singular: string, plural: string) {
  if (total === 0) return ''
  return `${total} ${total === 1 ? singular : plural}`
}
