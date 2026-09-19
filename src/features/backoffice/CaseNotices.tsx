import { InfoIcon, PauseCircleIcon } from 'lucide-react'

import { formatDateTime } from '@/lib/format'
import type { OrganizationSuspension } from '@/types/api'

/** El motivo de la suspensión, arriba de todo: es lo primero que pregunta
 *  quien llama. */
export function SuspensionNotice({ suspension }: { suspension: OrganizationSuspension }) {
  return (
    <div
      role="status"
      className="border-destructive/30 bg-destructive/5 flex gap-3 rounded-lg border px-4 py-3"
    >
      <PauseCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-0.5 text-sm">
        <p className="font-medium">
          Suspendida el {formatDateTime(suspension.at)}
          {suspension.by && `, por ${suspension.by}`}
        </p>
        <p className="text-muted-foreground break-words">Motivo: {suspension.reason}</p>
      </div>
    </div>
  )
}

/** Quien mira es miembro: se avisa antes de actuar, no con un error. */
export function OwnOrganizationNotice() {
  return (
    <div
      role="status"
      className="bg-muted/50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <InfoIcon className="text-muted-foreground size-4 shrink-0" />
      <p className="min-w-0">
        Es miembro de esta organización. Las acciones sobre ella las hace otra persona del
        personal.
      </p>
    </div>
  )
}
