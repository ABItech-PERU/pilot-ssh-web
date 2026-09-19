import { useQuery } from '@tanstack/react-query'
import { CreditCardIcon, ExternalLinkIcon, PaperclipIcon } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router'

import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import * as creditsApi from '@/features/credits/api'
import type { Comprobante } from '@/features/credits/comprobantes'
import type { ContextoDeCreditos } from '@/features/credits/CreditsPage'
import { describirMetodo } from '@/features/credits/metodos'
import { ReceiptViewer } from '@/features/credits/ReceiptViewer'
import { Dato, EstadoBadge } from '@/features/credits/partes'
import {
  construirHistorial,
  describirRecarga,
  explicarPunto,
} from '@/features/credits/recargas'
import { formatCredits, formatDateTime, formatPrice } from '@/lib/format'
import type { TopUpRequest, TopUpRequestDetail } from '@/types/api'

interface Props {
  solicitud: TopUpRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPagar: () => void
}

/** Ficha de la recarga junto a la lista. Lo pendiente va en el pie, igual
 *  en todas las filas. */
export function TopUpDetailPanel({ solicitud, open, onOpenChange, onPagar }: Props) {
  const { slug } = useOutletContext<ContextoDeCreditos>()
  const estado = solicitud && describirRecarga(solicitud)

  // El historial cuesta una consulta: solo al abrir
  const detalle = useQuery({
    queryKey: creditsApi.clavesCreditos.recarga(slug, solicitud?.id ?? ''),
    queryFn: () => creditsApi.fetchTopUp(slug, solicitud!.id),
    enabled: open && solicitud !== null,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <TopUpDetailHeader solicitud={solicitud} />

        {solicitud && (
          <TopUpDetailBody
            solicitud={solicitud}
            detalle={detalle.data}
            comprobante={creditsApi.comprobanteDe(slug, solicitud)}
          />
        )}

        <SidePanelFooter>
          {estado?.accion === 'pagar' && (
            <Button className="flex-1" onClick={onPagar}>
              <CreditCardIcon />
              Continuar el pago
            </Button>
          )}
          {estado?.accion === 'codigo' && solicitud && (
            <Button asChild className="flex-1">
              <a href={solicitud.voucher_url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Ver el código de pago
              </a>
            </Button>
          )}
        </SidePanelFooter>
      </SidePanelContent>
    </Sheet>
  )
}

export function TopUpDetailHeader({ solicitud }: { solicitud: TopUpRequest | null }) {
  return (
    <SidePanelHeader>
      <SheetTitle className="text-lg">{solicitud?.package_name ?? 'Recarga'}</SheetTitle>
      <SheetDescription>
        {solicitud &&
          `Pedida el ${formatDateTime(solicitud.created_at)}${
            solicitud.requested_by ? ` por ${solicitud.requested_by}` : ''
          }`}
      </SheetDescription>
    </SidePanelHeader>
  )
}

/** Común a la ficha del cliente y a la de la plataforma, que solo añade
 *  de quién es. */
export function TopUpDetailBody({
  solicitud,
  detalle,
  comprobante,
  extra,
  aviso,
  extraAbajo,
}: {
  solicitud: TopUpRequest
  /** Con el historial; llega después, la lista no lo trae. */
  detalle?: TopUpRequestDetail
  /** Cada lado lo pide por su ruta. */
  comprobante: Comprobante | null
  /** Filas extra, antes del historial. */
  extra?: React.ReactNode
  /** Entre los datos y el historial. */
  aviso?: React.ReactNode
  /** Tras el historial: a dónde ir desde aquí. */
  extraAbajo?: React.ReactNode
}) {
  const [viendoComprobante, setViendoComprobante] = useState(false)
  const estado = describirRecarga(solicitud)
  const metodo = describirMetodo(solicitud)
  const historial =
    detalle &&
    construirHistorial(detalle, {
      fechaHora: formatDateTime,
      creditos: formatCredits,
      precio: formatPrice,
    })

  return (
    <SidePanelBody>
      <dl className="divide-y">
        <Dato etiqueta="Estado">
          <span className="flex flex-col items-end gap-1">
            <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
            <span className="text-muted-foreground text-xs">
              {explicarPunto(estado.punto)}
            </span>
          </span>
        </Dato>
        {extra}
        <Dato etiqueta="Importe">
          {formatPrice(solicitud.price_amount, solicitud.price_currency)}
        </Dato>
        <Dato etiqueta="Créditos">{formatCredits(solicitud.credits)}</Dato>
        {metodo && <Dato etiqueta="Medio de pago">{metodo}</Dato>}
        {Number(solicitud.refunded_credits) > 0 && (
          <Dato etiqueta="Devuelto">
            {formatPrice(solicitud.refunded_amount, solicitud.price_currency)} ·{' '}
            {formatCredits(solicitud.refunded_credits)} créditos
          </Dato>
        )}
        {estado.punto === 'devuelta-en-parte' && (
          <Dato etiqueta="Quedan en el saldo">
            {formatCredits(
              Number(solicitud.credits) - Number(solicitud.refunded_credits),
            )}{' '}
            créditos
          </Dato>
        )}
        {solicitud.external_id && (
          <Dato etiqueta="Referencia del pago">
            <span className="font-machine text-xs break-all">
              {solicitud.external_id}
            </span>
          </Dato>
        )}
        {(solicitud.manual_reference || comprobante) && (
          <Dato etiqueta="Cobrada por fuera">
            <span className="flex flex-col items-end gap-0.5">
              {solicitud.manual_reference && (
                <span className="font-machine text-xs break-all">
                  Op. {solicitud.manual_reference}
                </span>
              )}
              {comprobante && (
                <button
                  type="button"
                  onClick={() => setViendoComprobante(true)}
                  className="text-primary focus-visible:outline-ring inline-flex items-center gap-1 rounded text-xs font-medium hover:underline focus-visible:-outline-offset-2 focus-visible:outline-1"
                >
                  <PaperclipIcon className="size-3.5" />
                  Ver el comprobante
                </button>
              )}
            </span>
          </Dato>
        )}
      </dl>

      {aviso && <div className="border-t px-5 py-4">{aviso}</div>}

      <section className="border-t px-5 py-4">
        <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.12em] uppercase">
          Historial
        </h3>
        {historial ? (
          <ol className="space-y-3">
            {historial.map((paso, indice) => (
              <li key={`${paso.cuando}-${paso.titulo}`} className="flex gap-3 text-sm">
                {/* Línea de puntos: el último es el estado actual */}
                <span className="flex flex-col items-center">
                  <span
                    aria-hidden
                    className={
                      indice === historial.length - 1
                        ? 'bg-primary mt-1.5 size-2 rounded-full'
                        : 'bg-border mt-1.5 size-2 rounded-full'
                    }
                  />
                  {indice < historial.length - 1 && (
                    <span aria-hidden className="bg-border mt-1 w-px flex-1" />
                  )}
                </span>
                <span className="min-w-0 pb-1">
                  <span className="block font-medium">{paso.titulo}</span>
                  {paso.detalle && (
                    <span className="text-muted-foreground block text-xs">
                      {paso.detalle}
                    </span>
                  )}
                  {paso.quien && (
                    <span className="text-muted-foreground block text-xs">
                      {paso.quien}
                    </span>
                  )}
                  <span className="text-muted-foreground block text-xs">
                    {paso.cuando}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        )}
      </section>

      {extraAbajo}

      {comprobante && (
        <ReceiptViewer
          comprobante={comprobante}
          paquete={solicitud.package_name}
          operacion={solicitud.manual_reference}
          open={viendoComprobante}
          onOpenChange={setViendoComprobante}
        />
      )}
    </SidePanelBody>
  )
}
