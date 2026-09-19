/** Los ids de la API son UUID. Una ruta con otra cosa no lleva a ningun
 *  sitio y no merece una peticion. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && UUID.test(valor)
}
