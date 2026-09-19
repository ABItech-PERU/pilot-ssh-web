import { CheckIcon } from 'lucide-react'

import { ErrorState, LineaEsqueleto } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { describirGratis, RECURSOS } from '@/features/credits/tarifas'
import { useTarifas } from '@/features/credits/use-creditos'
import { formatCredits } from '@/lib/format'
import { describirZona } from '@/lib/zona-horaria'
import type { PricingRule } from '@/types/api'

/** Aclara que no cobra cada conexión ni añadir a alguien. */
const GARANTIAS = [
  'Añadir personas y servidores es gratis.',
  'Varias terminales el mismo día cuentan una vez.',
  'Lo gratuito es por propietario, entre todas sus organizaciones.',
  'Los créditos no caducan.',
]

/** Origen de cada cobro, con las tarifas vigentes. */
export function PricingSection({ zonaDeCobro }: { zonaDeCobro?: string }) {
  const tarifas = useTarifas()
  const zona = zonaDeCobro ? describirZona(zonaDeCobro) : null

  return (
    <section className="space-y-2">
      <div className="space-y-0.5">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Cómo se cobra
        </h2>
        {/* Zona de cobro: dice en qué día cae el uso nocturno */}
        {zonaDeCobro === undefined ? (
          <LineaEsqueleto texto="xs" className="w-96 max-w-full" />
        ) : (
          zona && (
            <p className="text-muted-foreground text-xs">
              Cada día de uso va de 00:00 a 23:59,{' '}
              {zona.nombre === 'UTC'
                ? 'hora UTC'
                : `hora de ${zona.ciudad} (${zona.desfase})`}
              : la zona del propietario.
            </p>
          )
        )}
      </div>
      <div className="overflow-hidden rounded-lg border">
        {tarifas.isError ? (
          <div className="p-4">
            <ErrorState error={tarifas.error} onRetry={() => tarifas.refetch()} />
          </div>
        ) : (
          <ul className="divide-y">
            {tarifas.data
              ? tarifas.data.map((tarifa) => (
                  <FilaDeTarifa key={tarifa.resource} tarifa={tarifa} />
                ))
              : Array.from({ length: 2 }, (_, indice) => (
                  <li key={indice} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-8 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <LineaEsqueleto className="w-56 max-w-full" />
                      <LineaEsqueleto texto="xs" className="w-40" />
                    </div>
                    <div className="flex flex-col items-end">
                      <LineaEsqueleto className="w-20" />
                      <LineaEsqueleto texto="xs" className="w-16" />
                    </div>
                  </li>
                ))}
          </ul>
        )}
        <ul className="bg-muted/40 grid gap-2 border-t px-4 py-3 sm:grid-cols-2">
          {GARANTIAS.map((garantia) => (
            <li
              key={garantia}
              className="text-muted-foreground flex items-start gap-2 text-xs"
            >
              <CheckIcon className="text-success mt-px size-3.5 shrink-0" />
              {garantia}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function FilaDeTarifa({ tarifa }: { tarifa: PricingRule }) {
  const { etiqueta, icono: Icono } = RECURSOS[tarifa.resource]
  const gratis = describirGratis(tarifa)

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md">
        <Icono className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{etiqueta}</p>
        {gratis && <p className="text-muted-foreground text-xs">{gratis}</p>}
      </div>
      <p className="shrink-0 text-right text-sm">
        <span className="font-semibold tabular-nums">
          {formatCredits(tarifa.credits_per_day)}
        </span>{' '}
        créditos
        <span className="text-muted-foreground block text-xs">por día de uso</span>
      </p>
    </li>
  )
}
