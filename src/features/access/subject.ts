import { NIVELES } from '@/features/access/levels'
import type { AccessGrant, AccessGroup, AccessLevel } from '@/types/api'

/** Grupo o persona, nunca ambos. */
export type Sujeto =
  | { tipo: 'grupo'; id: string; nombre: string }
  | { tipo: 'persona'; email: string; nombre: string; avatar: string | null }

/** Sobre qué se comparte: la máquina entera o una de sus credenciales. */
export type Objetivo = { tipo: 'servidor' } | { tipo: 'credencial'; id: string }

/** Lo que alcanza el grupo, no quién está dentro: al invitar se ve si da
 *  acceso a todo. La organización entera eclipsa el resto. */
export function describirLoQueAlcanza(grupo: string, concesiones: AccessGrant[]): string {
  const suyas = concesiones.filter(
    (concesion) => concesion.group === grupo && !concesion.is_expired,
  )
  if (suyas.length === 0) return 'Todavía no da acceso a nada'

  const todo = suyas.find((concesion) => concesion.scope === 'organization')
  if (todo) return `Toda la organización · ${NIVELES[todo.level].etiqueta}`

  const nombres = suyas.map((concesion) => concesion.scope_label)
  const primeros = nombres.slice(0, 2).join(' · ')

  return nombres.length > 2 ? `${primeros} y ${nombres.length - 2} más` : primeros
}

/** Acceso que el elegido ya tiene, para no repetirlo. Cuenta solo lo que
 *  cubre lo compartido: una credencial suelta no es el servidor entero.
 *  Si tiene menos, dice qué. */
export function describirCobertura({
  sujeto,
  concesiones,
  grupos,
  objetivo,
  credenciales,
}: {
  sujeto: Sujeto
  concesiones: AccessGrant[]
  grupos: AccessGroup[]
  objetivo: Objetivo
  /** Nombra la credencial cuando solo tiene una. */
  credenciales: { id: string; username: string }[]
}): string | null {
  const vigentes = concesiones.filter((concesion) => !concesion.is_expired)

  const deSusGrupos = new Set(
    sujeto.tipo === 'persona'
      ? grupos
          .filter((grupo) => grupo.members.some((quien) => quien.email === sujeto.email))
          .map((grupo) => grupo.id)
      : [],
  )
  const suya = (concesion: AccessGrant) =>
    sujeto.tipo === 'grupo'
      ? concesion.group === sujeto.id
      : concesion.subject_email === sujeto.email
  const porSuGrupo = (concesion: AccessGrant) =>
    Boolean(concesion.group && deSusGrupos.has(concesion.group))
  const cubre = (concesion: AccessGrant) =>
    concesion.scope !== 'credential' ||
    (objetivo.tipo === 'credencial' && concesion.server_user === objetivo.id)

  const propia = vigentes.find((concesion) => suya(concesion) && cubre(concesion))
  if (propia) return `Ya puede ${verbo(propia)} aquí.`

  const porGrupo = vigentes.find((concesion) => porSuGrupo(concesion) && cubre(concesion))
  if (porGrupo) {
    return `Ya puede ${verbo(porGrupo)} aquí por el grupo «${porGrupo.subject_name}».`
  }

  const parcial = vigentes.find(
    (concesion) =>
      (suya(concesion) || porSuGrupo(concesion)) && concesion.scope === 'credential',
  )
  const credencial = credenciales.find((fila) => fila.id === parcial?.server_user)
  if (!parcial || !credencial) return null

  return `Ya puede ${verbo(parcial)} solo con ${credencial.username}.`
}

function verbo(concesion: AccessGrant) {
  return NIVELES[concesion.level].etiqueta.toLowerCase()
}

/** Mismo sujeto y objetivo: el backend actualiza la fila, no crea otra. El
 *  botón lo nombra y, si nada cambia, queda inactivo. */
export type Accion =
  | { tipo: 'dar' }
  | { tipo: 'nada' }
  | { tipo: 'cambiar-nivel'; nivel: AccessLevel }
  | { tipo: 'cambiar-caducidad' }
  | { tipo: 'quitar-caducidad' }

export function decidirAccion({
  sujeto,
  concesiones,
  objetivo,
  servidor,
  nivel,
  caducidad,
}: {
  sujeto: Sujeto
  concesiones: AccessGrant[]
  objetivo: Objetivo
  /** Su concesión es la de «todo el servidor». */
  servidor: string
  nivel: AccessLevel
  /** `AAAA-MM-DD`, o vacía si no caduca. */
  caducidad: string
}): Accion {
  const misma = concesiones.find(
    (concesion) =>
      !concesion.is_expired &&
      (sujeto.tipo === 'grupo'
        ? concesion.group === sujeto.id
        : concesion.subject_email === sujeto.email) &&
      (objetivo.tipo === 'servidor'
        ? concesion.scope === 'server' && concesion.server === servidor
        : concesion.scope === 'credential' && concesion.server_user === objetivo.id),
  )
  if (!misma) return { tipo: 'dar' }
  if (misma.level !== nivel) return { tipo: 'cambiar-nivel', nivel }

  // Se guarda al final del día elegido: basta comparar la fecha
  const tenia = misma.expires_at?.slice(0, 10) ?? ''
  if (tenia === caducidad) return { tipo: 'nada' }
  return caducidad ? { tipo: 'cambiar-caducidad' } : { tipo: 'quitar-caducidad' }
}

export function etiquetaDeAccion(accion: Accion): string {
  switch (accion.tipo) {
    case 'cambiar-nivel':
      return `Cambiar a ${NIVELES[accion.nivel].etiqueta}`
    case 'cambiar-caducidad':
      return 'Cambiar la caducidad'
    case 'quitar-caducidad':
      return 'Quitar la caducidad'
    default:
      return 'Dar acceso'
  }
}
