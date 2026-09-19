import { PackageIcon } from 'lucide-react'

import { CeldaCopiable } from '@/components/copy-cell'
import {
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
} from '@/components/side-panel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  autorDe,
  conceptoDe,
  ladoDe,
  NOMBRE_DEL_TIPO,
  saldoAntes,
} from '@/features/credits/movimientos'
import { Dato, Importe, LadoBadge } from '@/features/credits/partes'
import { formatCredits, formatDateTime } from '@/lib/format'
import type { PlatformTransaction } from '@/types/api'

interface Props {
  movimiento: PlatformTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Abre la recarga de la que salió el movimiento. */
  onVerRecarga: (movimiento: PlatformTransaction) => void
  buscandoRecarga: boolean
}

/** Movimiento completo junto al libro, con enlace a su recarga para
 *  cuadrar un abono con lo cobrado. */
export function TransactionPanel({
  movimiento,
  open,
  onOpenChange,
  onVerRecarga,
  buscandoRecarga,
}: Props) {
  // Acreditación: trae la recarga. Devolución: la referencia del pago
  const tieneRecarga = Boolean(movimiento?.topup || movimiento?.reference)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">Movimiento</SheetTitle>
          <SheetDescription>
            {movimiento && formatDateTime(movimiento.created_at)}
          </SheetDescription>
        </SidePanelHeader>

        {movimiento && (
          <SidePanelBody>
            <div className="border-b px-5 py-4">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-semibold">
                  <Importe cantidad={movimiento.amount} />
                </span>
                <span className="text-muted-foreground text-sm">créditos</span>
                <span className="ml-auto">
                  <LadoBadge
                    lado={ladoDe(movimiento)}
                    etiqueta={NOMBRE_DEL_TIPO[movimiento.kind]}
                  />
                </span>
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {conceptoDe(movimiento)}
              </p>
            </div>

            <dl className="divide-y">
              <Dato etiqueta="Organización">
                <span className="block">
                  <span className="block">{movimiento.organization.name}</span>
                  <span className="text-muted-foreground font-machine block text-xs">
                    {movimiento.organization.slug}
                  </span>
                </span>
              </Dato>
              {/* Antes y después: muestran si venía justa o de sobra */}
              <Dato etiqueta="Saldo antes">
                {formatCredits(saldoAntes(movimiento))} créditos
              </Dato>
              <Dato etiqueta="Saldo después">
                {formatCredits(movimiento.balance_after)} créditos
              </Dato>
              <Dato etiqueta="Cuándo">{formatDateTime(movimiento.created_at)}</Dato>
              {autorDe(movimiento) && <Dato etiqueta="Quién">{autorDe(movimiento)}</Dato>}
              {movimiento.topup && (
                <Dato etiqueta="Paquete">{movimiento.topup.package_name}</Dato>
              )}
              {movimiento.reference && (
                <Dato etiqueta="Referencia del pago">
                  <CeldaCopiable valor={movimiento.reference} etiqueta="la referencia" />
                </Dato>
              )}
            </dl>
          </SidePanelBody>
        )}

        <SidePanelFooter>
          {movimiento && tieneRecarga && (
            <Button
              className="flex-1"
              disabled={buscandoRecarga}
              onClick={() => onVerRecarga(movimiento)}
            >
              <PackageIcon />
              Ver la recarga
            </Button>
          )}
        </SidePanelFooter>
      </SidePanelContent>
    </Sheet>
  )
}
