import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  CalendarClockIcon,
  ChevronDownIcon,
  CoinsIcon,
  GiftIcon,
  PackageIcon,
  PlusIcon,
  Trash2Icon,
  StarIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SettingsRow, SettingsSection } from '@/components/settings-section'
import { EmptyState, ErrorState, PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { CreditPriceDialog } from '@/features/backoffice/CreditPriceDialog'
import { PackageDialog } from '@/features/backoffice/PackageDialog'
import { PricingRuleDialog } from '@/features/backoffice/PricingRuleDialog'
import {
  describirPrecioPorCredito,
  formatearUnitario,
  porcentajeDeRegalo,
  seOfreceAhora,
} from '@/features/backoffice/paquetes'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import { TINTE } from '@/features/credits/partes'
import { describirGratis, RECURSOS } from '@/features/credits/tarifas'
import { toApiError } from '@/lib/api-error'
import { formatCredits, formatDate, formatPrice } from '@/lib/format'
import type { PlatformPackage, PlatformPricingRule } from '@/types/api'

const TITULO = 'Precios y paquetes'
const DESCRIPCION = 'Lo que se cobra por día de uso y lo que se ofrece al recargar.'

/** Tarifas diarias y paquetes de recarga, con los bloques de ajustes del
 *  resto del sistema. */
export function PlatformPricingPage() {
  const { user } = useSession()

  if (!llevaFinanzas(user))
    return (
      <SinPermiso
        titulo={TITULO}
        descripcion={DESCRIPCION}
        permiso="can_manage_finances"
      />
    )

  return <Precios />
}

function Precios() {
  const [tarifa, setTarifa] = useState<PlatformPricingRule | null>(null)
  // `null` cerrado; sin paquete, se crea uno
  const [paquete, setPaquete] = useState<{ editar: PlatformPackage | null } | null>(null)
  const [valorAbierto, setValorAbierto] = useState(false)
  const [borrando, setBorrando] = useState<PlatformPackage | null>(null)
  const [verRetirados, setVerRetirados] = useState(false)
  const cliente = useQueryClient()

  const tarifas = useQuery({
    queryKey: platformApi.clavesPlataforma.tarifas(),
    queryFn: platformApi.fetchPricing,
  })
  const paquetes = useQuery({
    queryKey: platformApi.clavesPlataforma.paquetes(),
    queryFn: platformApi.fetchPackages,
  })
  const valorDelCredito = useQuery({
    queryKey: platformApi.clavesPlataforma.valorDelCredito(),
    queryFn: platformApi.fetchCreditPrice,
  })
  const unitario = valorDelCredito.data?.credit_unit_price ?? null
  // Primero lo que ve el cliente; lo apagado y caducado, plegado al final
  const enOferta = (paquetes.data ?? []).filter((oferta) => seOfreceAhora(oferta))
  const retirados = (paquetes.data ?? []).filter((oferta) => !seOfreceAhora(oferta))

  const borrar = useMutation({
    mutationFn: () => platformApi.deletePackage(borrando!.id),
    onSuccess: async () => {
      await platformApi.invalidarPlataforma(cliente)
      setBorrando(null)
      toast.success('Paquete borrado.')
    },
    onError: (fallo) => toast.error(toApiError(fallo).message),
  })

  return (
    <div className="space-y-8">
      <PageHeader title={TITULO} description={DESCRIPCION} />

      <SettingsSection
        titulo="Tarifas"
        descripcion="Los cambios rigen desde el día siguiente."
        ayuda="El cobro de cada día usa las tarifas vigentes al cerrarlo."
      >
        {tarifas.isError ? (
          <div className="p-4">
            <ErrorState error={tarifas.error} onRetry={() => tarifas.refetch()} />
          </div>
        ) : tarifas.data ? (
          tarifas.data.map((regla) => (
            <SettingsRow
              key={regla.resource}
              icono={RECURSOS[regla.resource].icono}
              etiqueta={RECURSOS[regla.resource].etiqueta}
              pista={describirGratis(regla) ?? 'Nada gratuito.'}
              onEditar={() => setTarifa(regla)}
            >
              {formatCredits(regla.credits_per_day)} créditos al día
            </SettingsRow>
          ))
        ) : (
          <Esqueleto filas={2} />
        )}
      </SettingsSection>

      <SettingsSection
        titulo="Valor del crédito"
        descripcion="La unidad de cuenta del sistema."
        ayuda="Rige los paquetes nuevos. Los creados no cambian."
      >
        {unitario ? (
          <SettingsRow
            icono={CoinsIcon}
            etiqueta="1 crédito"
            pista={`S/ 100 dan ${formatCredits(100 / Number(unitario))} créditos de base.`}
            onEditar={() => setValorAbierto(true)}
          >
            {formatearUnitario(unitario)}
          </SettingsRow>
        ) : (
          <Esqueleto filas={1} />
        )}
      </SettingsSection>

      <SettingsSection
        titulo="Paquetes de recarga"
        descripcion="Lo que el cliente elige al recargar."
        ayuda="Los paquetes ya vendidos no se borran: se desactivan."
        accion={
          <Button size="sm" onClick={() => setPaquete({ editar: null })}>
            <PlusIcon />
            Añadir paquete
          </Button>
        }
      >
        {paquetes.isError ? (
          <div className="p-4">
            <ErrorState error={paquetes.error} onRetry={() => paquetes.refetch()} />
          </div>
        ) : paquetes.data ? (
          paquetes.data.length === 0 ? (
            <EmptyState
              compacto
              icon={PackageIcon}
              title="Sin paquetes"
              description="El cliente no tiene nada que elegir al recargar."
            />
          ) : (
            <>
              {enOferta.map((oferta) => (
                <FilaDePaquete
                  key={oferta.id}
                  oferta={oferta}
                  onEditar={() => setPaquete({ editar: oferta })}
                  onBorrar={() => setBorrando(oferta)}
                />
              ))}
              {enOferta.length === 0 && (
                <EmptyState
                  compacto
                  icon={PackageIcon}
                  title="Ninguno en oferta"
                  description="El cliente no tiene qué elegir al recargar."
                />
              )}
              {retirados.length > 0 && (
                <Retirados
                  cuantos={retirados.length}
                  abierto={verRetirados}
                  onAlternar={() => setVerRetirados(!verRetirados)}
                >
                  {retirados.map((oferta) => (
                    <FilaDePaquete
                      key={oferta.id}
                      oferta={oferta}
                      onEditar={() => setPaquete({ editar: oferta })}
                      onBorrar={() => setBorrando(oferta)}
                    />
                  ))}
                </Retirados>
              )}
            </>
          )
        ) : (
          <Esqueleto filas={3} />
        )}
      </SettingsSection>

      <PricingRuleDialog
        tarifa={tarifa}
        open={tarifa !== null}
        onOpenChange={(abierto) => !abierto && setTarifa(null)}
      />

      <CreditPriceDialog
        valor={unitario}
        open={valorAbierto}
        onOpenChange={setValorAbierto}
      />

      <ConfirmDialog
        open={borrando !== null}
        onOpenChange={(abierto) => !abierto && setBorrando(null)}
        titulo={`¿Borrar ${borrando?.name ?? 'el paquete'}?`}
        descripcion="Nunca se vendió."
        detalles={['Deja de ofrecerse al recargar', 'Queda en el historial de precios']}
        accion="Borrar el paquete"
        destructiva
        pendiente={borrar.isPending}
        onConfirmar={() => borrar.mutate()}
      />

      <PackageDialog
        paquete={paquete?.editar ?? null}
        unitario={unitario}
        open={paquete !== null}
        onOpenChange={(abierto) => !abierto && setPaquete(null)}
      />
    </div>
  )
}

function Esqueleto({ filas }: { filas: number }) {
  return Array.from({ length: filas }, (_, indice) => (
    <div key={indice} className="flex items-center justify-between gap-3 p-4">
      <Skeleton className="h-4 w-52" />
      <Skeleton className="h-8 w-24" />
    </div>
  ))
}

/** Créditos y unitario: en fila, un paquete descuadrado salta a la vista. */
function pistaDelPaquete(oferta: PlatformPackage): string {
  const partes = [
    Number(oferta.bonus_credits) > 0
      ? `${formatCredits(oferta.credits)} créditos + ${formatCredits(oferta.bonus_credits)} de regalo · ${formatCredits(oferta.total_credits)} en total`
      : `${formatCredits(oferta.credits)} créditos`,
    describirPrecioPorCredito(oferta.price_amount, oferta.total_credits),
  ]
  return partes.filter(Boolean).join(' · ')
}

/** Solo si la oferta está programada. La vencida se dice en pasado. */
function vigencia(oferta: PlatformPackage): string | null {
  const vigente = seOfreceAhora(oferta)
  if (oferta.available_until) {
    const dia = formatDate(oferta.available_until)
    return vigente ? `Hasta el ${dia}` : `Terminó el ${dia}`
  }
  if (!oferta.available_from) return null
  const dia = formatDate(oferta.available_from)
  return vigente ? `Desde el ${dia}` : `Empieza el ${dia}`
}

/** Solo borra lo nunca vendido. Con ventas, el botón sigue y explica por
 *  qué: si desapareciera, parecería falta de permiso. */
function BotonDeBorrar({
  oferta,
  onBorrar,
}: {
  oferta: PlatformPackage
  onBorrar: () => void
}) {
  const boton = (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={!oferta.can_delete}
      aria-label={`Borrar ${oferta.name}`}
      onClick={onBorrar}
    >
      <Trash2Icon />
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{boton}</span>
      </TooltipTrigger>
      <TooltipContent>
        {oferta.can_delete ? 'Borrar' : 'Ya se vendió: apáguelo en vez de borrarlo.'}
      </TooltipContent>
    </Tooltip>
  )
}

/** Misma fila para paquetes en oferta y retirados. */
function FilaDePaquete({
  oferta,
  onEditar,
  onBorrar,
}: {
  oferta: PlatformPackage
  onEditar: () => void
  onBorrar: () => void
}) {
  return (
    <SettingsRow
      etiqueta={oferta.name}
      pista={pistaDelPaquete(oferta)}
      onEditar={onEditar}
      acciones={<BotonDeBorrar oferta={oferta} onBorrar={onBorrar} />}
    >
      <span className="inline-flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'font-medium tabular-nums',
            oferta.is_active ? 'text-foreground' : 'line-through',
          )}
        >
          {formatPrice(oferta.price_amount, oferta.price_currency)}
        </span>
        {!oferta.follows_policy && (
          <Badge className={cn('gap-1 border-transparent', TINTE.aviso)}>
            <TriangleAlertIcon className="size-3" />
            Fuera del valor
          </Badge>
        )}
        {vigencia(oferta) && (
          <Badge
            className={cn(
              'gap-1 border-transparent',
              seOfreceAhora(oferta) ? TINTE.info : TINTE.neutro,
            )}
          >
            <CalendarClockIcon className="size-3" />
            {vigencia(oferta)}
          </Badge>
        )}
        {porcentajeDeRegalo(oferta) !== null && (
          <Badge className={cn('gap-1 border-transparent', TINTE.ok)}>
            <GiftIcon className="size-3" />+{porcentajeDeRegalo(oferta)}%
          </Badge>
        )}
        {oferta.is_recommended && (
          <Badge className={cn('gap-1 border-transparent', TINTE.aviso)}>
            <StarIcon className="size-3" />
            Recomendado
          </Badge>
        )}
        {!oferta.is_active && (
          <Badge className={cn('border-transparent', TINTE.neutro)}>Apagado</Badge>
        )}
      </span>
    </SettingsRow>
  )
}

/** Lo retirado, plegado para no competir con lo que se ofrece. */
function Retirados({
  cuantos,
  abierto,
  onAlternar,
  children,
}: {
  cuantos: number
  abierto: boolean
  onAlternar: () => void
  children: React.ReactNode
}) {
  const idPanel = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={onAlternar}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-3 p-4 text-sm transition-colors"
      >
        <span>
          {cuantos === 1 ? '1 paquete retirado' : `${cuantos} paquetes retirados`}
        </span>
        <ChevronDownIcon
          className={cn('size-4 transition-transform', abierto && 'rotate-180')}
        />
      </button>
      <div
        id={idPanel}
        // grid-rows 0fr → 1fr anima una altura desconocida
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        inert={!abierto}
      >
        <div className="divide-y overflow-hidden border-t">{children}</div>
      </div>
    </>
  )
}
