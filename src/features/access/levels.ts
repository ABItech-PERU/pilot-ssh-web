import { EyeIcon, SettingsIcon, Share2Icon, TerminalIcon, UsersIcon } from 'lucide-react'

import type { AccessLevel } from '@/types/api'

interface Nivel {
  etiqueta: string
  /** Qué permite, en una línea; se muestra al elegirlo. */
  alcance: string
  icono: React.ElementType
}

/** Niveles de acceso a una máquina. Distintos del rol: el rol dice qué
 *  gestiona en la organización; el nivel, a qué entra. */
export const NIVELES: Record<AccessLevel, Nivel> = {
  view: {
    etiqueta: 'Ver',
    alcance: 'Ve el servidor y abre sus enlaces. No abre terminales.',
    icono: EyeIcon,
  },
  connect: {
    etiqueta: 'Conectar',
    alcance: 'Abre terminales con las credenciales del servidor.',
    icono: TerminalIcon,
  },
  manage: {
    etiqueta: 'Gestionar',
    alcance: 'Además edita el servidor, sus credenciales y sus enlaces.',
    icono: SettingsIcon,
  },
}

export const NIVELES_EN_ORDEN: AccessLevel[] = ['view', 'connect', 'manage']

/** Sobre una credencial suelta la nombra en singular; «Gestionar» solo
 *  edita con la máquina entera. */
export function describirNivel(nivel: AccessLevel, credencial: string | null): string {
  if (credencial === null) return NIVELES[nivel].alcance

  switch (nivel) {
    case 'view':
      return 'Ve el servidor en su lista, sin abrir terminales.'
    case 'connect':
      return `Abre terminales con ${credencial}.`
    case 'manage':
      return `Abre terminales con ${credencial}; editar pide el servidor entero.`
  }
}

/** Editar o borrar. Decide el `access_level` del backend, no el rol: un
 *  miembro gestiona una maquina y solo conecta a otra. */
export function puedeGestionar(recurso: { access_level: AccessLevel }): boolean {
  return recurso.access_level === 'manage'
}

/** Abrir terminal. «Ver» no conecta: el backend cerraria con 4403, asi que
 *  el boton no se ofrece. */
export function puedeConectar(recurso: { access_level: AccessLevel }): boolean {
  return recurso.access_level === 'connect' || recurso.access_level === 'manage'
}

/** Mismo panel para todos; solo quien administra reparte. «Compartir» solo
 *  para quien puede; el resto ve «Accesos», como la pestana. */
export function accionDeAcceso(puedeRepartir: boolean): {
  etiqueta: string
  icono: React.ElementType
} {
  return puedeRepartir
    ? { etiqueta: 'Compartir', icono: Share2Icon }
    : { etiqueta: 'Accesos', icono: UsersIcon }
}
