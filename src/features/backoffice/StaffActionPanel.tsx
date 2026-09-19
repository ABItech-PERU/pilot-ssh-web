import { ArrowRightIcon } from 'lucide-react'

import { SidePanelBody, SidePanelContent, SidePanelHeader } from '@/components/side-panel'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  camposDelCambio,
  retratoDelCambio,
  tituloDelCambio,
} from '@/features/backoffice/cambios'
import { Dato } from '@/features/credits/partes'
import { formatDateTime } from '@/lib/format'
import type { AuditEntry, StaffActivityEntry } from '@/types/api'

interface Props {
  cambio: AuditEntry | StaffActivityEntry | null
  titulo: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Acción del personal completa: motivo, sobre quién y, en el catálogo,
 *  el valor anterior. En la fila solo cabe la frase. */
export function StaffActionPanel({ cambio, titulo, open, onOpenChange }: Props) {
  const campos = camposDelCambio(cambio)
  const retrato = retratoDelCambio(cambio)
  const esBorrado = cambio?.action === 'credits.package_deleted'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>
            {cambio ? formatDateTime(cambio.created_at) : ''}
          </SheetDescription>
        </SidePanelHeader>

        {cambio && (
          <SidePanelBody className="divide-y">
            <dl>
              <Dato etiqueta="Qué pasó">{tituloDelCambio(cambio)}</Dato>
              {cambio.detail && <Dato etiqueta="Detalle">{cambio.detail}</Dato>}
              {'organization' in cambio && (
                <Dato etiqueta="Organización">
                  {cambio.organization?.name ?? 'De la plataforma'}
                </Dato>
              )}
              <Dato etiqueta="Quién">
                {cambio.actor ? (
                  <span className="block">
                    <span className="block">{cambio.actor}</span>
                    <span className="text-muted-foreground block text-xs">
                      {cambio.actor_email}
                    </span>
                  </span>
                ) : (
                  'Una cuenta que ya no existe'
                )}
              </Dato>
            </dl>

            {retrato.length > 0 && (
              <div className="space-y-3 p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {esBorrado ? 'Cómo era' : 'Con qué se creó'}
                </p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {retrato.map((valor) => (
                    <div key={valor.label}>
                      <dt className="text-muted-foreground text-xs">{valor.label}</dt>
                      <dd className="text-sm font-medium">{valor.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {campos.length > 0 && (
              <div className="space-y-3 p-5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Qué cambió
                </p>
                <dl className="space-y-3">
                  {campos.map((campo) => (
                    <div key={campo.label} className="space-y-1">
                      <dt className="text-sm font-medium">{campo.label}</dt>
                      <dd className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">
                          {campo.before}
                        </span>
                        <ArrowRightIcon
                          className="text-muted-foreground size-3.5 shrink-0"
                          aria-label="pasó a"
                        />
                        <span className="font-medium">{campo.after}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <dl>
              {/* «Equipo», no «Desde»: junto a las fechas de la oferta se
                  leería como una de ellas */}
              <Dato etiqueta="Equipo">{cambio.device || 'Sin dato'}</Dato>
              <Dato etiqueta="IP">
                <span className="font-machine text-xs">{cambio.ip_address || '—'}</span>
              </Dato>
            </dl>
          </SidePanelBody>
        )}
      </SidePanelContent>
    </Sheet>
  )
}
