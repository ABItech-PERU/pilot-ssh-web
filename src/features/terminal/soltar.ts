/** Lo que se suelta o se elige para subir, con las carpetas abiertas. */

export interface Soltado {
  archivo: File
  /** La ruta dentro de lo soltado, como «sitio/css/a.css», o solo el nombre. */
  relativa: string
}

interface EntradaDeArchivo {
  isFile: true
  name: string
  file: (listo: (archivo: File) => void, fallo?: (error: unknown) => void) => void
}

interface EntradaDeCarpeta {
  isFile: false
  isDirectory: true
  name: string
  createReader: () => {
    readEntries: (
      listo: (entradas: Entrada[]) => void,
      fallo?: (error: unknown) => void,
    ) => void
  }
}

type Entrada = EntradaDeArchivo | EntradaDeCarpeta

/** Las entradas se piden antes de esperar nada, porque el navegador las
 *  retira en cuanto termina el evento de soltar. */
export async function leerSoltados(datos: DataTransfer): Promise<Soltado[]> {
  const entradas = [...datos.items]
    .map((item) => item.webkitGetAsEntry?.() as Entrada | null | undefined)
    .filter((entrada): entrada is Entrada => Boolean(entrada))
  if (!entradas.length) return leerElegidos([...datos.files])

  const leidos: Soltado[] = []
  for (const entrada of entradas) await recorrer(entrada, '', leidos)
  return leidos
}

async function recorrer(entrada: Entrada, dentro: string, leidos: Soltado[]) {
  const relativa = dentro ? `${dentro}/${entrada.name}` : entrada.name
  if (entrada.isFile) {
    const archivo = await new Promise<File>((listo, fallo) => entrada.file(listo, fallo))
    leidos.push({ archivo, relativa })
    return
  }
  for (const hija of await leerTodas(entrada)) await recorrer(hija, relativa, leidos)
}

/** Chrome entrega los hijos en tandas de cien, hasta una vacía. */
async function leerTodas(carpeta: EntradaDeCarpeta): Promise<Entrada[]> {
  const lector = carpeta.createReader()
  const todas: Entrada[] = []
  for (;;) {
    const tanda = await new Promise<Entrada[]>((listo, fallo) =>
      lector.readEntries(listo, fallo),
    )
    if (!tanda.length) return todas
    todas.push(...tanda)
  }
}

/** Lo elegido con el selector, con su ruta si se eligió una carpeta. */
export function leerElegidos(archivos: File[]): Soltado[] {
  return archivos.map((archivo) => ({
    archivo,
    relativa: archivo.webkitRelativePath || archivo.name,
  }))
}
