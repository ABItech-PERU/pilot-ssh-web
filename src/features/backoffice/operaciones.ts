import type { TonoDeRecarga } from '@/features/credits/recargas'
import { formatRelative } from '@/lib/format'
import type {
  EmailStatus,
  PaymentNotice,
  PaymentNoticeStatus,
  TaskHealth,
  TaskRunStatus,
} from '@/types/api'

interface Estado {
  etiqueta: string
  tono: TonoDeRecarga
}

export const ESTADO_DEL_AVISO: Record<PaymentNoticeStatus, Estado> = {
  pending: { etiqueta: 'Pendiente', tono: 'proceso' },
  processed: { etiqueta: 'Procesado', tono: 'ok' },
  ignored: { etiqueta: 'Ignorado', tono: 'neutro' },
  failed: { etiqueta: 'Fallido', tono: 'peligro' },
}

export const ESTADO_DEL_CORREO: Record<EmailStatus, Estado> = {
  pendiente: { etiqueta: 'Pendiente', tono: 'proceso' },
  enviada: { etiqueta: 'Enviado', tono: 'ok' },
  fallida: { etiqueta: 'Fallido', tono: 'peligro' },
}

export const ESTADO_DE_LA_CORRIDA: Record<TaskRunStatus, Estado> = {
  running: { etiqueta: 'En curso', tono: 'proceso' },
  succeeded: { etiqueta: 'Terminada', tono: 'ok' },
  failed: { etiqueta: 'Falló', tono: 'peligro' },
}

/** Cada estado con su explicación: «atrasada» sola no dice que lo caído
 *  es beat. */
export const SALUD_DE_LA_TAREA: Record<TaskHealth, Estado & { explicacion: string }> = {
  ok: { etiqueta: 'Al día', tono: 'ok', explicacion: 'Corrió a su hora.' },
  late: {
    etiqueta: 'Atrasada',
    tono: 'peligro',
    explicacion:
      'Debió volver a correr y no lo hizo. Revise que beat y el worker estén levantados.',
  },
  failed: {
    etiqueta: 'Falló',
    tono: 'peligro',
    explicacion: 'La última corrida terminó con error. Se vuelve a intentar a su hora.',
  },
  running: {
    etiqueta: 'En curso',
    tono: 'proceso',
    explicacion: 'Está corriendo ahora.',
  },
  interrupted: {
    etiqueta: 'Interrumpida',
    tono: 'aviso',
    explicacion: 'Empezó hace más de una hora y no terminó: el worker se detuvo a mitad.',
  },
  never: {
    etiqueta: 'Sin corridas',
    tono: 'neutro',
    explicacion:
      'Todavía no ha corrido. Si el sistema lleva tiempo arriba, beat no está levantado.',
  },
}

/** «3 intentos». Con uno, nada: es lo normal. */
export function describirIntentos(intentos: number): string {
  return intentos > 1 ? `${intentos} intentos` : ''
}

/** Vencido no es retraso: la pasada de cada cinco minutos lo recoge. */
export function describirProximoIntento(iso: string, ahora = Date.now()): string {
  return new Date(iso).getTime() <= ahora
    ? 'En cola para procesarse'
    : `Reintenta ${formatRelative(iso).toLowerCase()}`
}

/** Procesado ya cumplió; pendiente tiene su propio reintento. */
export function sePuedeReprocesar(aviso: Pick<PaymentNotice, 'status'>): boolean {
  return aviso.status === 'failed' || aviso.status === 'ignored'
}

const SEGUNDOS = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

/** «0,4 s», «2 min 5 s»: pasado el minuto, en minutos. */
export function formatearDuracion(segundos: number | null): string {
  if (segundos === null) return '—'
  if (segundos < 60) return `${SEGUNDOS.format(segundos)} s`
  const minutos = Math.floor(segundos / 60)
  const resto = Math.round(segundos % 60)
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`
}

/** Qué hacer con un correo que no llegó. No se reenvía: no se guarda, y
 *  sus códigos y enlaces caducan. Se vuelve a pedir desde su origen. */
export function remedioDelCorreo(tipo: string): string {
  switch (tipo) {
    case 'codigo_de_acceso':
      return 'Pídale que vuelva a iniciar sesión: le llega un código nuevo.'
    case 'contrasena_olvidada':
      return 'Envíele el enlace para cambiar la contraseña desde su cuenta.'
    case 'correo_por_confirmar':
      return 'Reenvíele la confirmación del correo desde su cuenta.'
    case 'correo_nuevo':
      return 'Pídale que repita el cambio de correo: se manda otra confirmación.'
    case 'invitacion_recibida':
      return 'Quien administra la organización reenvía la invitación desde su equipo.'
    default:
      return 'Este correo avisa de algo que ya pasó y no hace falta reenviarlo. Si falla con cada correo, revise la dirección de la cuenta.'
  }
}
