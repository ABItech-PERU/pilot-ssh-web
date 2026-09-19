import { LightbulbIcon, UserIcon } from 'lucide-react'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ESTADO_DEL_CORREO, remedioDelCorreo } from '@/features/backoffice/operaciones'
import { Dato, EstadoBadge } from '@/features/credits/partes'
import { formatDateTime } from '@/lib/format'
import type { EmailDelivery } from '@/types/api'

interface Props {
  correo: EmailDelivery | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAbrirCuenta: (cuentaId: string) => void
}

/** Destino, envío y, si falló, qué hacer. Sin contenido: lleva códigos y
 *  enlaces, que no se guardan. */
export function EmailPanel({ correo, open, onOpenChange, onAbrirCuenta }: Props) {
  const estado = correo && ESTADO_DEL_CORREO[correo.status]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">{correo?.kind_label ?? 'Correo'}</SheetTitle>
          <SheetDescription>
            {correo && `Pedido el ${formatDateTime(correo.created_at)}`}
          </SheetDescription>
        </SidePanelHeader>

        {correo && estado && (
          <SidePanelBody>
            <div className="space-y-2 border-b px-5 py-4">
              <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
              {correo.subject && <p className="text-sm">«{correo.subject}»</p>}
              {correo.error && (
                <p className="text-destructive text-sm break-words">
                  {correo.status === 'enviada' ? 'Falló antes de salir: ' : ''}
                  {correo.error}
                </p>
              )}
            </div>

            <dl className="divide-y">
              <Dato etiqueta="Para">
                <span className="break-all">{correo.destination}</span>
              </Dato>
              <Dato etiqueta="Cuenta">
                {correo.person ? (
                  <span className="block">
                    <span className="block">{correo.person.name}</span>
                    {correo.person.email !== correo.destination && (
                      <span className="text-muted-foreground block text-xs break-all">
                        Hoy usa {correo.person.email}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Ya no existe</span>
                )}
              </Dato>
              <Dato etiqueta="Enviado">
                {correo.sent_at ? formatDateTime(correo.sent_at) : 'No'}
              </Dato>
              <Dato etiqueta="Intentos">{correo.attempts}</Dato>
            </dl>

            {correo.status === 'fallida' && (
              <section className="border-t px-5 py-4">
                <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  <LightbulbIcon className="size-3.5" />
                  Qué hacer
                </h3>
                <p className="text-sm">{remedioDelCorreo(correo.kind)}</p>
              </section>
            )}

            <p className="text-muted-foreground border-t px-5 py-4 text-xs">
              El contenido no se guarda: lleva códigos y enlaces que dan acceso a la
              cuenta.
            </p>
          </SidePanelBody>
        )}

        {correo?.person && (
          <SidePanelFooter>
            <Button className="flex-1" onClick={() => onAbrirCuenta(correo.person!.id)}>
              <UserIcon />
              Abrir su cuenta
            </Button>
          </SidePanelFooter>
        )}
      </SidePanelContent>
    </Sheet>
  )
}
