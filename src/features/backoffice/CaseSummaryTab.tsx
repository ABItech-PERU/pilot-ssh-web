import { useCaso } from '@/features/backoffice/caso'
import {
  AccountFacts,
  BalanceFacts,
  MoneyFacts,
  UsageFacts,
} from '@/features/backoffice/OrganizationFacts'

const TARJETA = 'bg-card overflow-hidden rounded-lg border'

/** Los bloques del panel lateral, en tarjetas: la ficha tiene ancho para
 *  dos a la vez. */
export function CaseSummaryTab() {
  const organizacion = useCaso()

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="grid gap-4">
        <BalanceFacts detalle={organizacion} className={TARJETA} />
        <UsageFacts
          organizacion={organizacion}
          detalle={organizacion}
          className={TARJETA}
        />
      </div>
      <div className="grid gap-4">
        <MoneyFacts
          organizacion={organizacion}
          detalle={organizacion}
          className={TARJETA}
        />
        <AccountFacts
          organizacion={organizacion}
          detalle={organizacion}
          className={TARJETA}
        />
      </div>
    </div>
  )
}
