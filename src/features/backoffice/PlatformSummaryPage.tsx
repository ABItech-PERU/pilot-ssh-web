import { useQuery } from '@tanstack/react-query'
import {
  BanknoteIcon,
  Building2Icon,
  CheckIcon,
  ClockIcon,
  HandCoinsIcon,
  ShieldAlertIcon,
  TrendingDownIcon,
  UndoIcon,
  WalletIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'

import { Bloque, VerTodo } from '@/components/bloque'
import { ErrorState, PageHeader } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { llevaFinanzas, primeraSeccion } from '@/features/backoffice/permisos'
import { buildPlatformPath } from '@/features/backoffice/rutas'
import { repartir } from '@/features/backoffice/resumen'
import { TopUpResolution, type Resolucion } from '@/features/backoffice/TopUpResolution'
import { nombreDelMetodo } from '@/features/credits/metodos'
import { conceptoDe } from '@/features/credits/movimientos'
import {
  Cifra,
  FiltroDePeriodo,
  Importe,
  resolverPeriodoDeCreditos,
  type PeriodoDeCreditos,
} from '@/features/credits/partes'
import { formatCredits, formatDateTime, formatPrice, formatRelative } from '@/lib/format'
import type { Rango } from '@/lib/periods'

const EN_RESUMEN = 5
/** Pedidas sin pasarela, que finanzas cobra y acredita. Excluye los pagos
 *  en línea abandonados. */
const POR_ACREDITAR: platformApi.FiltrosDeRecargasDePlataforma = { charge: 'offline' }

export function PlatformSummaryPage() {
  const { user } = useSession()

  // El resumen es de finanzas; el resto va a su primera sección
  if (!llevaFinanzas(user)) {
    return (
      <Navigate to={buildPlatformPath(primeraSeccion(user) ?? 'organizations')} replace />
    )
  }

  return <Resumen />
}

/** Cobrado y devuelto en el periodo, lo pendiente hoy y dos listas de
 *  uso diario, cortadas con enlace a su sección. */
function Resumen() {
  const [periodo, setPeriodo] = useState<PeriodoDeCreditos>('mes')
  const [rango, setRango] = useState<Rango>(
    () => resolverPeriodoDeCreditos('mes') ?? { from: '', to: '' },
  )
  const [resolucion, setResolucion] = useState<Resolucion | null>(null)

  const resumen = useQuery({
    queryKey: platformApi.clavesPlataforma.resumen(rango),
    queryFn: () => platformApi.fetchSummary(rango),
    placeholderData: (anterior) => anterior,
  })
  const porAcreditar = useQuery({
    queryKey: platformApi.clavesPlataforma.recargas(1, EN_RESUMEN, POR_ACREDITAR),
    queryFn: () => platformApi.fetchTopUps(1, EN_RESUMEN, POR_ACREDITAR),
  })
  const ultimos = useQuery({
    queryKey: platformApi.clavesPlataforma.movimientos(1, EN_RESUMEN, {}),
    queryFn: () => platformApi.fetchTransactions(1, EN_RESUMEN, {}),
  })

  const datos = resumen.data
  const moneda = datos?.currency ?? 'PEN'
  const devuelto = Number(datos?.refunded.count ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen"
        description="Lo cobrado, lo devuelto y lo que espera en toda la plataforma."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <FiltroDePeriodo
              periodo={periodo}
              rango={rango}
              onChange={(siguiente, rangoNuevo) => {
                setPeriodo(siguiente)
                setRango(rangoNuevo)
              }}
            />
          </div>
        }
      />

      {resumen.isError ? (
        <ErrorState error={resumen.error} onRetry={() => resumen.refetch()} />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cifra
              icono={BanknoteIcon}
              etiqueta="Cobrado"
              valor={datos && formatPrice(datos.charged.amount, moneda)}
              unidad=""
              pie={
                datos &&
                `${contar(datos.charged.count, 'recarga acreditada', 'recargas acreditadas')} · ${formatCredits(datos.charged.credits)} créditos, ${formatCredits(datos.charged.bonus_credits)} de regalo`
              }
            />
            <Cifra
              icono={UndoIcon}
              etiqueta="Devuelto"
              valor={datos && formatPrice(datos.refunded.amount, moneda)}
              unidad=""
              tono={devuelto > 0 ? 'aviso' : 'normal'}
              pie={
                datos &&
                `${contar(devuelto, 'devolución', 'devoluciones')} · ${formatCredits(datos.refunded.credits)} créditos descontados`
              }
            />
            <Cifra
              icono={HandCoinsIcon}
              etiqueta="A mano"
              valor={datos && formatCredits(datos.granted_credits)}
              pie="Asignaciones y ajustes de finanzas."
            />
            <Cifra
              icono={TrendingDownIcon}
              etiqueta="Consumido"
              valor={datos && formatCredits(datos.consumed_credits)}
              pie={
                datos &&
                `${contar(datos.active_organizations, 'organización con uso', 'organizaciones con uso')}.`
              }
            />
          </dl>

          <section className="space-y-2">
            <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
              A hoy
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Cifra
                icono={WalletIcon}
                etiqueta="Saldo vivo"
                valor={datos && formatCredits(datos.balance_total)}
                pie="Lo que suman todas las billeteras."
              />
              <Cifra
                icono={Building2Icon}
                etiqueta="Organizaciones"
                valor={datos && String(datos.organizations)}
                unidad=""
                pie="Registradas, personales incluidas."
              />
              <Cifra
                icono={ClockIcon}
                etiqueta="Por acreditar"
                valor={datos && String(datos.pending_manual)}
                unidad="recargas"
                tono={datos && datos.pending_manual > 0 ? 'aviso' : 'normal'}
                pie="Pedidas sin pasarela: se cobran por fuera."
              />
              <Cifra
                icono={ShieldAlertIcon}
                etiqueta="En disputa"
                valor={datos && String(datos.disputed)}
                unidad="recargas"
                tono={datos && datos.disputed > 0 ? 'peligro' : 'normal'}
                pie="Contracargos que el proveedor revisa."
              />
            </dl>
          </section>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque titulo="Cómo pagan">
          {resumen.isError ? (
            <div className="p-4">
              <ErrorState error={resumen.error} onRetry={() => resumen.refetch()} />
            </div>
          ) : !datos ? (
            <Esqueleto />
          ) : datos.methods.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              Sin recargas acreditadas en el periodo.
            </p>
          ) : (
            <ul className="divide-y">
              {repartir(datos.methods).map((medio) => (
                <li
                  key={medio.method || 'sin-registrar'}
                  className="space-y-1.5 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{nombreDelMetodo(medio.method)}</span>
                    <span className="text-right tabular-nums">
                      {formatPrice(medio.amount, moneda)}
                      <span className="text-muted-foreground block text-xs">
                        {contar(medio.count, 'recarga', 'recargas')} ·{' '}
                        {Math.round(medio.parte * 100)} %
                      </span>
                    </span>
                  </div>
                  {/* Parte del dinero, no de las recargas: diez de S/ 20
                      pesan menos que dos de S/ 100 */}
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.max(medio.parte * 100, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Recargas por acreditar">
          {porAcreditar.isError ? (
            <div className="p-4">
              <ErrorState
                error={porAcreditar.error}
                onRetry={() => porAcreditar.refetch()}
              />
            </div>
          ) : porAcreditar.isPending ? (
            <Esqueleto />
          ) : porAcreditar.data.results.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              Nada por cobrar. Lo pedido en línea y sin pagar está en Recargas.
            </p>
          ) : (
            <ul className="divide-y">
              {porAcreditar.data.results.map((solicitud) => (
                <li
                  key={solicitud.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {solicitud.organization.name} ·{' '}
                      {formatPrice(solicitud.price_amount, solicitud.price_currency)}
                    </p>
                    <p
                      className="text-muted-foreground text-xs"
                      title={formatDateTime(solicitud.created_at)}
                    >
                      {solicitud.package_name} · pedida{' '}
                      {formatRelative(solicitud.created_at).toLowerCase()}
                      {solicitud.requested_by && ` por ${solicitud.requested_by}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setResolucion({ solicitud, accion: 'complete' })}
                  >
                    <CheckIcon />
                    Acreditar
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <VerTodo to={buildPlatformPath('topups')}>Ver todas las recargas</VerTodo>
        </Bloque>

        <div className="lg:col-span-2">
          <Bloque titulo="Últimos movimientos">
            {ultimos.isError ? (
              <div className="p-4">
                <ErrorState error={ultimos.error} onRetry={() => ultimos.refetch()} />
              </div>
            ) : ultimos.isPending ? (
              <Esqueleto />
            ) : ultimos.data.results.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                Aquí aparecerán las recargas y el uso de todas las organizaciones.
              </p>
            ) : (
              <ul className="divide-y">
                {ultimos.data.results.map((movimiento) => (
                  <li
                    key={movimiento.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {movimiento.organization.name} · {conceptoDe(movimiento)}
                      </span>
                      <span
                        className="text-muted-foreground block text-xs"
                        title={formatDateTime(movimiento.created_at)}
                      >
                        {formatRelative(movimiento.created_at)}
                      </span>
                    </span>
                    <Importe cantidad={movimiento.amount} />
                  </li>
                ))}
              </ul>
            )}
            <VerTodo to={buildPlatformPath('transactions')}>
              Ver todos los movimientos
            </VerTodo>
          </Bloque>
        </div>
      </div>

      <TopUpResolution resolucion={resolucion} onClose={() => setResolucion(null)} />
    </div>
  )
}

function Esqueleto() {
  return (
    <ul className="divide-y">
      {Array.from({ length: EN_RESUMEN }, (_, indice) => (
        <li key={indice} className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-14" />
        </li>
      ))}
    </ul>
  )
}

function contar(cuantos: number, uno: string, varios: string): string {
  return `${cuantos} ${cuantos === 1 ? uno : varios}`
}
