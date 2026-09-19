import { cn } from 'cn'
import {
  CircleCheckIcon,
  CoinsIcon,
  KeyRoundIcon,
  PauseCircleIcon,
  ShieldXIcon,
  UserXIcon,
} from 'lucide-react'

import type { DiagnosisCode, DiagnosisVerdict } from '@/types/api'

type Tono = 'ok' | 'aviso' | 'peligro'

const ASPECTO: Record<DiagnosisCode, { icono: React.ElementType; tono: Tono }> = {
  en_orden: { icono: CircleCheckIcon, tono: 'ok' },
  sin_credenciales: { icono: KeyRoundIcon, tono: 'aviso' },
  cuenta_desactivada: { icono: UserXIcon, tono: 'peligro' },
  sin_acceso: { icono: ShieldXIcon, tono: 'peligro' },
  organizacion_suspendida: { icono: PauseCircleIcon, tono: 'peligro' },
  sin_creditos: { icono: CoinsIcon, tono: 'aviso' },
}

const COLOR: Record<Tono, string> = {
  ok: 'text-success',
  aviso: 'text-warning',
  peligro: 'text-destructive',
}

const FONDO: Record<Tono, string> = {
  ok: 'bg-success/10',
  aviso: 'bg-warning/10',
  peligro: 'bg-destructive/10',
}

/** Motivo en grande y solución debajo. Compartido por administración y
 *  personal; cada uno añade debajo lo que ve de las credenciales. */
export function DiagnosisResult({
  veredicto,
  children,
}: {
  veredicto: DiagnosisVerdict
  children?: React.ReactNode
}) {
  const { icono: Icono, tono } = ASPECTO[veredicto.code]

  return (
    <div role="status" aria-live="polite" className="rounded-lg border">
      <div className="flex gap-3 p-4">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            COLOR[tono],
            FONDO[tono],
          )}
        >
          <Icono className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">{veredicto.message}</p>
          <p className="text-muted-foreground text-sm">{veredicto.solution}</p>
        </div>
      </div>
      {children && <div className="border-t">{children}</div>}
    </div>
  )
}

/** Sin fondo: en una lista pesa menos. */
export function colorDelVeredicto(codigo: DiagnosisCode): string {
  return COLOR[ASPECTO[codigo].tono]
}

export function iconoDelVeredicto(codigo: DiagnosisCode): React.ElementType {
  return ASPECTO[codigo].icono
}
