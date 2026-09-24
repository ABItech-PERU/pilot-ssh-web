/** Dónde está parada la shell, para que el archivo caiga ahí.
 *
 *  La copia va por SFTP, ajeno al `cd` del PTY. Se averigua sin molestar a
 *  la shell: por lo que anuncia (OSC 7) o por lo que muestra su prompt.
 */

/** `file://maquina/ruta`, como lo manda un shell que anuncia su carpeta. */
export function leerOsc7(carga: string): string | null {
  if (!carga.startsWith('file://')) return null

  const ruta = carga.slice('file://'.length).replace(/^[^/]*/, '')
  return ruta ? decodeURIComponent(ruta) : null
}

const FIN_DEL_PROMPT = /[$#%>]\s*$/

/** Lo que el prompt ya enseña: `…:~/proy$`, `…:/var/www#`, `➜ ~/proy`. */
export function leerDelPrompt(linea: string): string | null {
  // Con algo tecleado detrás, esa ruta aún no es la carpeta
  if (!FIN_DEL_PROMPT.test(linea)) return null

  const dicho = linea.replace(FIN_DEL_PROMPT, '').trimEnd()
  const ultimo = dicho.split(/\s+/).pop() ?? ''
  const ruta = ultimo.includes(':') ? ultimo.slice(ultimo.lastIndexOf(':') + 1) : ultimo

  return ruta.startsWith('/') || ruta.startsWith('~') ? ruta : null
}
