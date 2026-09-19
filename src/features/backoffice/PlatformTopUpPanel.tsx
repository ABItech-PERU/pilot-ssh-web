import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CheckIcon, ReceiptIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router'

import { CeldaCopiable } from '@/components/copy-cell'
import { SidePanelContent, SidePanelFooter } from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import {
  describirCobro,
  esperaCobroPorFuera,
  seResuelveAMano,
} from '@/features/backoffice/recargas'
import { OwnOrganizationNotice } from '@/features/backoffice/CaseNotices'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { buildCasePath } from '@/features/backoffice/rutas'
import type { AccionSobreRecarga } from '@/features/backoffice/TopUpResolution'
import { Dato, TINTE } from '@/features/credits/partes'
import { TopUpDetailBody, TopUpDetailHeader } from '@/features/credits/TopUpDetailPanel'
import type { PlatformTopUp } from '@/types/api'

interface Props {
  solicitud: PlatformTopUp | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin él, la ficha es de solo lectura, como desde Movimientos. */
  onResolver?: (solicitud: PlatformTopUp, accion: AccionSobreRecarga) => void
}

/** La ficha del cliente más la organización y el cobro. Las acciones a
 *  mano van en el pie. */
export function PlatformTopUpPanel({ solicitud, open, onOpenChange, onResolver }: Props) {
  const { user } = useSession()

  const detalle = useQuery({
    queryKey: platformApi.clavesPlataforma.recarga(solicitud?.id ?? ''),
    queryFn: () => platformApi.fetchTopUp(solicitud!.id),
    enabled: open && solicitud !== null,
  })
  const aMano =
    solicitud !== null &&
    onResolver !== undefined &&
    seResuelveAMano(solicitud) &&
    llevaFinanzas(user) &&
    !solicitud.is_own
  // Abandonada en línea: se puede acreditar, pero no es lo normal
  const abandonada = aMano && !esperaCobroPorFuera(solicitud)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <TopUpDetailHeader solicitud={solicitud} />

        {solicitud && (
          <TopUpDetailBody
            solicitud={solicitud}
            detalle={detalle.data}
            comprobante={platformApi.comprobanteDe(solicitud)}
            extra={
              <>
                <Dato etiqueta="Organización">
                  <span className="block">
                    <span className="block">{solicitud.organization.name}</span>
                    <span className="text-muted-foreground font-machine block text-xs">
                      {solicitud.organization.slug}
                    </span>
                  </span>
                </Dato>
                <Dato etiqueta="Cobro">{describirCobro(solicitud).etiqueta}</Dato>
                {/* Contacto de quien pidió, para cobrarle */}
                {solicitud.contact_phone && (
                  <Dato etiqueta="Teléfono o WhatsApp">
                    <CeldaCopiable
                      valor={solicitud.contact_phone}
                      etiqueta="el teléfono"
                    />
                  </Dato>
                )}
              </>
            }
            aviso={
              solicitud.is_own ? (
                <OwnOrganizationNotice />
              ) : (
                abandonada && (
                  <p className={cn('flex gap-2 rounded-md p-3 text-xs', TINTE.aviso)}>
                    <TriangleAlertIcon className="size-4 shrink-0" />
                    <span>
                      Se pidió en línea y no hay pago registrado: no hay nada que
                      acreditar. Solo si el cliente pagó por fuera, acredítela con su
                      comprobante.
                    </span>
                  </p>
                )
              )
            }
            extraAbajo={
              <div className="border-t px-5 py-4">
                <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Ver más
                </h3>
                {/* A su ficha, no a Movimientos: quien atiende también llega
                    aquí, y el libro global es de finanzas */}
                <Button asChild variant="outline" size="sm">
                  <Link to={buildCasePath(solicitud.organization.slug, 'money')}>
                    <ReceiptIcon />
                    Su dinero
                  </Link>
                </Button>
              </div>
            }
          />
        )}

        <SidePanelFooter>
          {aMano && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onResolver?.(solicitud, 'cancel')}
              >
                <XIcon />
                Cancelar recarga
              </Button>
              <Button
                variant={abandonada ? 'outline' : 'default'}
                className="flex-1"
                onClick={() => onResolver?.(solicitud, 'complete')}
              >
                <CheckIcon />
                Acreditar
              </Button>
            </>
          )}
        </SidePanelFooter>
      </SidePanelContent>
    </Sheet>
  )
}
