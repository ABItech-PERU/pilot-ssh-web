/** Bajar un archivo del servidor con el gestor de descargas del navegador.
 *  Va directo al disco, con avance, pausa y cancelación del propio navegador. */

import { env } from '@/lib/env'

export function fetchUrlDeDescarga(url: string, api: string): string {
  return new URL(url, api || window.location.origin).toString()
}

/** Como la API responde con un adjunto, el navegador no sale de aquí. */
export function abrirDescarga(url: string, api: string = env.apiUrl) {
  const enlace = document.createElement('a')
  enlace.href = fetchUrlDeDescarga(url, api)
  enlace.rel = 'noopener'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
}
