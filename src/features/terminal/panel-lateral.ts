/** Ancho del panel lateral junto a la terminal. Vive en el navegador. */

import { useSyncExternalStore } from 'react'

const CLAVE = 'pilotssh.panel-lateral.ancho'

export const ANCHO_INICIAL = 416
export const ANCHO_MINIMO = 300

/** La terminal conserva al menos el 40 %, unas 70 columnas en una laptop. */
const PROPORCION_MAXIMA = 0.6

export function fetchAnchoMaximo(disponible: number): number {
  return Math.max(ANCHO_MINIMO, Math.floor(disponible * PROPORCION_MAXIMA))
}

export function limitarAncho(ancho: number, disponible: number): number {
  return Math.round(Math.min(Math.max(ancho, ANCHO_MINIMO), fetchAnchoMaximo(disponible)))
}

export function leerAncho(): number {
  try {
    const guardado = Number(window.localStorage.getItem(CLAVE))
    return Number.isFinite(guardado) && guardado >= ANCHO_MINIMO
      ? guardado
      : ANCHO_INICIAL
  } catch {
    return ANCHO_INICIAL
  }
}

export function guardarAncho(ancho: number) {
  try {
    window.localStorage.setItem(CLAVE, String(ancho))
  } catch {
    // Sin almacenamiento, el panel vuelve al ancho inicial al recargar
  }
}

/** Desde una laptop el panel va al lado y empuja a la terminal; en algo más
 *  estrecho la terminal quedaría en pocas columnas y el panel va encima. */
const CON_LUGAR_AL_LADO = '(min-width: 1024px)'

function suscribir(avisar: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const consulta = window.matchMedia(CON_LUGAR_AL_LADO)
  consulta.addEventListener('change', avisar)
  return () => consulta.removeEventListener('change', avisar)
}

const hayLugar = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(CON_LUGAR_AL_LADO).matches

export function useHayLugarAlLado(): boolean {
  return useSyncExternalStore(suscribir, hayLugar, () => false)
}
