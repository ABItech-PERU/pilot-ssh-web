/** Va primero: en Descargas el archivo convive con los de otros sistemas. */
const MARCA = 'Pilot SSH'

/** «Pilot SSH - Auditoría - Acme.xlsx». Quita del espacio los caracteres
 *  que Windows no admite en un nombre de archivo. */
export function nombreDeArchivo(titulo: string, espacio: string): string {
  const limpio = espacio
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const partes = limpio ? [MARCA, titulo, limpio] : [MARCA, titulo]
  return `${partes.join(' - ')}.xlsx`
}

/** El navegador solo descarga desde un enlace: se crea uno al vuelo y la
 *  URL se libera cuando la descarga ya arrancó. */
export function descargarArchivo(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
