import type { SessionStatus } from '@/types/api'

/** Palabra y color del punto por estado. El color nunca va solo, por
 *  quien no distingue verde de rojo. */
export const ESTADOS_DE_SESION: Record<
  SessionStatus,
  { etiqueta: string; punto: string; texto: string }
> = {
  active: { etiqueta: 'Abierta', punto: 'bg-success', texto: 'text-success' },
  closed: {
    etiqueta: 'Cerrada',
    punto: 'bg-muted-foreground',
    texto: 'text-muted-foreground',
  },
  error: { etiqueta: 'Con error', punto: 'bg-destructive', texto: 'text-destructive' },
}

/** Un estado desconocido se lee como cerrada: la lista no se rompe. */
export function describirEstado(status: string) {
  return ESTADOS_DE_SESION[status as SessionStatus] ?? ESTADOS_DE_SESION.closed
}
