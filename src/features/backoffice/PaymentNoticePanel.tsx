import { useQuery } from '@tanstack/react-query'
import { PackageIcon, RotateCwIcon } from 'lucide-react'
import { Link } from 'react-router'

import { CeldaCopiable } from '@/components/copy-cell'
import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import * as platformApi from '@/features/backoffice/api'
import {
  describirProximoIntento,
  ESTADO_DEL_AVISO,
  sePuedeReprocesar,
} from '@/features/backoffice/operaciones'
import { buildCasePath } from '@/features/backoffice/rutas'
import { Dato, EstadoBadge } from '@/features/credits/partes'
import { formatDateTime } from '@/lib/format'
import type { PaymentNotice } from '@/types/api'

interface Props {
  aviso: PaymentNotice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin él no se ofrece: sin finanzas solo se mira. */
  onReprocesar?: (aviso: PaymentNotice) => void
  onVerRecarga: (aviso: PaymentNotice) => void
  buscandoRecarga: boolean
}

/** Qué llegó, qué se hizo y, si falló, por qué. Lo recibido va tal cual,
 *  para cotejarlo con el panel del proveedor. */
export function PaymentNoticePanel({
  aviso,
  open,
  onOpenChange,
  onReprocesar,
  onVerRecarga,
  buscandoRecarga,
}: Props) {
  // El contenido recibido es costoso: solo al abrir
  const detalle = useQuery({
    queryKey: platformApi.clavesPlataforma.avisoDePago(aviso?.id ?? ''),
    queryFn: () => platformApi.fetchPaymentNotice(aviso!.id),
    enabled: open && aviso !== null,
  })
  const estado = aviso && ESTADO_DEL_AVISO[aviso.status]
  const hayPayload = Object.keys(detalle.data?.payload ?? {}).length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">Aviso de pago</SheetTitle>
          <SheetDescription>
            {aviso && `Recibido el ${formatDateTime(aviso.created_at)}`}
          </SheetDescription>
        </SidePanelHeader>

        {aviso && estado && (
          <SidePanelBody>
            <div className="space-y-2 border-b px-5 py-4">
              <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
              {aviso.result && <p className="text-sm">{aviso.result}</p>}
              {aviso.last_error && (
                <p className="text-destructive text-sm break-words">{aviso.last_error}</p>
              )}
              {aviso.status === 'pending' && aviso.next_attempt_at && (
                <p className="text-muted-foreground text-xs">
                  {describirProximoIntento(aviso.next_attempt_at)}
                </p>
              )}
            </div>

            <dl className="divide-y">
              <Dato etiqueta="Origen">{aviso.source_label}</Dato>
              {aviso.event && (
                <Dato etiqueta="Evento">
                  <span className="font-machine text-xs">{aviso.event}</span>
                </Dato>
              )}
              <Dato etiqueta="Recurso">
                <span className="block text-right">
                  <span className="text-muted-foreground block text-xs">
                    {aviso.resource_type}
                  </span>
                  <CeldaCopiable valor={aviso.resource_id} etiqueta="el id del recurso" />
                </span>
              </Dato>
              <Dato etiqueta="Recarga">
                {aviso.topup ? (
                  <span className="block">
                    <span className="block">{aviso.topup.package_name}</span>
                    <Link
                      to={buildCasePath(aviso.topup.organization.slug)}
                      className="text-muted-foreground block text-xs hover:underline"
                    >
                      {aviso.topup.organization.name}
                    </Link>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Ninguna</span>
                )}
              </Dato>
              <Dato etiqueta="Intentos">{aviso.attempts}</Dato>
              <Dato etiqueta="Procesado">
                {aviso.processed_at ? formatDateTime(aviso.processed_at) : 'Todavía no'}
              </Dato>
            </dl>

            {aviso.source === 'webhook' && (
              <section className="border-t px-5 py-4">
                <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Lo que llegó
                </h3>
                {detalle.isPending ? (
                  <Skeleton className="h-24 w-full" />
                ) : hayPayload ? (
                  <pre className="bg-muted/50 font-machine max-h-72 overflow-auto rounded-md border p-3 text-xs">
                    {JSON.stringify(detalle.data?.payload, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm">Llegó sin cuerpo.</p>
                )}
              </section>
            )}
          </SidePanelBody>
        )}

        {aviso && (aviso.topup || (onReprocesar && sePuedeReprocesar(aviso))) && (
          <SidePanelFooter>
            {aviso.topup && (
              <Button
                variant="outline"
                className="flex-1"
                disabled={buscandoRecarga}
                onClick={() => onVerRecarga(aviso)}
              >
                <PackageIcon />
                Ver la recarga
              </Button>
            )}
            {onReprocesar && sePuedeReprocesar(aviso) && (
              <Button className="flex-1" onClick={() => onReprocesar(aviso)}>
                <RotateCwIcon />
                Reprocesar
              </Button>
            )}
          </SidePanelFooter>
        )}
      </SidePanelContent>
    </Sheet>
  )
}
