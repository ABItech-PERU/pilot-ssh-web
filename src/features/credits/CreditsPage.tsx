import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { CalendarIcon, PlusIcon, TrendingDownIcon, WalletIcon } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'

import { ErrorState, PageHeader } from '@/components/states'
import { TabNav } from '@/components/tab-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as creditsApi from '@/features/credits/api'
import { Cifra, TINTE } from '@/features/credits/partes'
import { PricingSection } from '@/features/credits/PricingSection'
import { buildCreditsPath } from '@/features/credits/rutas'
import { describirEstado, describirSaldo, type Tono } from '@/features/credits/saldo'
import { TopUpDialog } from '@/features/credits/TopUpDialog'
import { useSaldo } from '@/features/credits/use-creditos'
import { resumirMes } from '@/features/credits/uso'
import { useCurrentOrganization } from '@/features/organizations/current'
import { formatCredits } from '@/lib/format'
import type { TopUpRequest, Wallet } from '@/types/api'

/** Lo que las pestañas reciben ya cargado. */
export interface ContextoDeCreditos {
  slug: string
  saldo?: Wallet
  pendientes: TopUpRequest[]
  abrirRecarga: () => void
  /** Paga una pendiente sin volver a elegir paquete. */
  continuarPago: (solicitud: TopUpRequest) => void
}

const TINTE_DEL_ESTADO: Record<Tono, string> = {
  normal: TINTE.ok,
  aviso: TINTE.aviso,
  peligro: TINTE.peligro,
}

/** Saldo y tarifas. Quien administra ve además uso, movimientos y
 *  recargas, cada uno en su pestaña. */
export function CreditsPage() {
  const { slug, organization } = useCurrentOrganization()
  const administra = organization?.role === 'owner' || organization?.role === 'admin'
  // `null`: cerrado. Con `retomar`, se paga esa; sin ella, se elige
  const [recargando, setRecargando] = useState<{ retomar: TopUpRequest | null } | null>(
    null,
  )

  const saldo = useSaldo(slug)
  const uso = useQuery({
    queryKey: creditsApi.clavesCreditos.uso(slug),
    queryFn: () => creditsApi.fetchUsage(slug!),
    enabled: Boolean(slug) && administra,
  })
  const recargas = useQuery({
    queryKey: creditsApi.clavesCreditos.recargas(slug),
    queryFn: () => creditsApi.fetchPendingTopUps(slug!),
    enabled: Boolean(slug) && administra,
  })

  // Todas: con efectivo puede haber una en el agente y otra recién pedida
  const pendientes = recargas.data ?? []
  const estado = saldo.data && describirSaldo(saldo.data)
  const insignia = saldo.data && describirEstado(saldo.data.state)
  const mes =
    uso.data &&
    saldo.data &&
    resumirMes(uso.data, new Date(), saldo.data.billing_time_zone)

  const contexto: ContextoDeCreditos = {
    slug: slug ?? '',
    saldo: saldo.data,
    pendientes,
    abrirRecarga: () => setRecargando({ retomar: null }),
    continuarPago: (solicitud) => setRecargando({ retomar: solicitud }),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Créditos"
        description="Solo se paga el día que se usa."
        action={
          administra && (
            <Button onClick={() => setRecargando({ retomar: null })}>
              <PlusIcon />
              Recargar créditos
            </Button>
          )
        }
      />

      {saldo.isError ? (
        <ErrorState error={saldo.error} onRetry={() => saldo.refetch()} />
      ) : (
        <dl className={cn('grid gap-3', administra ? 'sm:grid-cols-3' : 'sm:max-w-sm')}>
          <Cifra
            icono={WalletIcon}
            etiqueta="Saldo"
            valor={saldo.data && formatCredits(saldo.data.balance)}
            pie={estado?.detalle}
            tono={estado?.tono}
            insignia={
              insignia && (
                <Badge
                  className={cn('border-transparent', TINTE_DEL_ESTADO[insignia.tono])}
                >
                  {insignia.etiqueta}
                </Badge>
              )
            }
          />
          {administra && !uso.isError && (
            <>
              <Cifra
                icono={CalendarIcon}
                etiqueta="Gastado este mes"
                valor={mes && formatCredits(mes.creditos)}
                pie={mes && `${mes.dias} ${mes.dias === 1 ? 'día' : 'días'} con uso.`}
              />
              <Cifra
                icono={TrendingDownIcon}
                etiqueta="Gasto medio al día"
                valor={saldo.data && formatCredits(saldo.data.daily_burn)}
                pie="Del último mes."
              />
            </>
          )}
        </dl>
      )}

      {administra && slug ? (
        <>
          <TabNav
            etiqueta="Secciones de créditos"
            pestanas={[
              { to: buildCreditsPath(), etiqueta: 'Resumen', end: true },
              { to: buildCreditsPath('transactions'), etiqueta: 'Movimientos' },
              { to: buildCreditsPath('usage'), etiqueta: 'Uso' },
              {
                to: buildCreditsPath('topups'),
                etiqueta: 'Recargas',
                cuenta: pendientes.length || null,
              },
            ]}
          />
          <Outlet context={contexto} />
        </>
      ) : (
        <>
          <PricingSection zonaDeCobro={saldo.data?.billing_time_zone} />
          <p className="text-muted-foreground text-sm">
            El uso de cada día, los movimientos y las recargas los ve quien administra.
          </p>
        </>
      )}

      {administra && slug && (
        <TopUpDialog
          slug={slug}
          open={recargando !== null}
          onOpenChange={(abierto) => !abierto && setRecargando(null)}
          gastoDiario={Number(saldo.data?.daily_burn ?? 0)}
          enLinea={saldo.data?.online_payment ?? true}
          retomar={recargando?.retomar ?? null}
        />
      )}
    </div>
  )
}
