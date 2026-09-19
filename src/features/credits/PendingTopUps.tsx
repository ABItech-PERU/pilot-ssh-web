import { cn } from 'cn'
import {
  ClockIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  HourglassIcon,
  PhoneIcon,
  StoreIcon,
  type LucideIcon,
} from 'lucide-react'

import { Bloque } from '@/components/bloque'
import { Button } from '@/components/ui/button'
import { TINTE } from '@/features/credits/partes'
import {
  describirRecarga,
  explicarPendiente,
  type PuntoDeRecarga,
} from '@/features/credits/recargas'
import { formatPrice, formatRelative } from '@/lib/format'
import type { TopUpRequest } from '@/types/api'

const ICONO: Partial<Record<PuntoDeRecarga, LucideIcon>> = {
  'sin-pagar': ClockIcon,
  'en-agente': StoreIcon,
  'en-confirmacion': HourglassIcon,
}

/** Lo pedido sin acreditar, sobre el resumen. El color dice si toca
 *  actuar o esperar. */
export function PendingTopUps({
  pendientes,
  enLinea,
  onPagar,
}: {
  pendientes: TopUpRequest[]
  /** Con pasarela queda pagar; sin ella, revisar por dónde se cobra. */
  enLinea: boolean
  onPagar: (solicitud: TopUpRequest) => void
}) {
  return (
    <Bloque
      titulo={
        pendientes.length === 1
          ? 'Recarga pendiente'
          : `${pendientes.length} recargas pendientes`
      }
    >
      <ul className="divide-y">
        {pendientes.map((solicitud) => (
          <RecargaPendiente
            key={solicitud.id}
            solicitud={solicitud}
            enLinea={enLinea}
            onPagar={onPagar}
          />
        ))}
      </ul>
    </Bloque>
  )
}

function RecargaPendiente({
  solicitud,
  enLinea,
  onPagar,
}: {
  solicitud: TopUpRequest
  enLinea: boolean
  onPagar: (solicitud: TopUpRequest) => void
}) {
  const estado = describirRecarga(solicitud, enLinea)
  const Icono = ICONO[estado.punto] ?? ClockIcon
  // A mitad de frase: «pedida hace 8 min», no «pedida Hace 8 min»
  const relativo = formatRelative(solicitud.created_at)
  const cuando = relativo.charAt(0).toLowerCase() + relativo.slice(1)
  const { titulo, detalle } = explicarPendiente(
    estado.punto,
    formatPrice(solicitud.price_amount, solicitud.price_currency),
    cuando,
    enLinea,
  )

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      {/* En móvil el botón baja a su línea, alineado con el texto */}
      <span
        aria-hidden
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md',
          TINTE[estado.tono],
        )}
      >
        <Icono className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-muted-foreground text-xs">{detalle}</p>
      </div>
      {estado.accion && (
        <span className="basis-full pl-12 sm:basis-auto sm:pl-0">
          {estado.accion === 'codigo' ? (
            <Button asChild size="sm">
              <a href={solicitud.voucher_url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Ver el código
              </a>
            </Button>
          ) : (
            <Button size="sm" onClick={() => onPagar(solicitud)}>
              {enLinea ? <CreditCardIcon /> : <PhoneIcon />}
              {enLinea ? 'Continuar el pago' : 'Revisar el contacto'}
            </Button>
          )}
        </span>
      )}
    </li>
  )
}
