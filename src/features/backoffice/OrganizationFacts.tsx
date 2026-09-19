import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  describirEstadoDeOrganizacion,
  tonoDeInsignia,
} from '@/features/backoffice/organizaciones'
import { Dato, EstadoBadge, TINTE } from '@/features/credits/partes'
import { describirEstado, describirSaldo } from '@/features/credits/saldo'
import { formatCredits, formatDateTime, formatPrice, formatRelative } from '@/lib/format'
import { describirZona } from '@/lib/zona-horaria'
import type { PlatformOrganization, PlatformOrganizationDetail } from '@/types/api'

/** Cuatro bloques de datos de la organización, comunes al panel lateral
 *  (apilados) y a la ficha del caso (en tarjetas). */
interface Props {
  organizacion: PlatformOrganization
  /** Undefined mientras carga: la lista ya trae lo básico. */
  detalle?: PlatformOrganizationDetail
  className?: string
}

const ESPERA = '…'

export function BalanceFacts({ detalle, className }: Omit<Props, 'organizacion'>) {
  const billetera = detalle?.wallet
  const estado = billetera && describirEstado(billetera.state)
  const zona = billetera && describirZona(billetera.billing_time_zone)
  const correoConfirmado = detalle?.activity.owner_email_verified

  return (
    <section className={className}>
      <div className="border-b px-5 py-4">
        <TituloDeBloque>Saldo</TituloDeBloque>
        {billetera && estado ? (
          <>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-2xl font-semibold tabular-nums">
                {formatCredits(billetera.balance)}
              </span>
              <span className="text-muted-foreground text-sm">créditos</span>
              <Badge
                className={cn(
                  'ml-auto border-transparent',
                  TINTE[tonoDeInsignia(estado.tono)],
                )}
              >
                {estado.etiqueta}
              </Badge>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {describirSaldo(billetera).detalle}
            </p>
          </>
        ) : (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
        )}
      </div>
      <dl className="divide-y">
        <Dato etiqueta="Gasto medio al día">
          {billetera ? `${formatCredits(billetera.daily_burn)} créditos` : ESPERA}
        </Dato>
        <Dato etiqueta="Le dura">
          {billetera
            ? billetera.days_left === null
              ? 'Sin gasto reciente'
              : contar(billetera.days_left, 'día', 'días')
            : ESPERA}
        </Dato>
        {billetera?.grace_ends_at && (
          <Dato etiqueta="Margen hasta">{formatDateTime(billetera.grace_ends_at)}</Dato>
        )}
        <Dato etiqueta="Lo gratuito de cada día">
          {billetera
            ? billetera.has_free_allowance
              ? 'Activo'
              : correoConfirmado === false
                ? 'Sin confirmar el correo'
                : 'Sin activar'
            : ESPERA}
        </Dato>
        <Dato etiqueta="Zona de cobro">
          {zona
            ? zona.nombre === 'UTC'
              ? 'UTC'
              : `${zona.ciudad} (${zona.desfase})`
            : ESPERA}
        </Dato>
      </dl>
    </section>
  )
}

export function MoneyFacts({ organizacion, detalle, className }: Props) {
  const actividad = detalle?.activity

  return (
    <section className={className}>
      <TituloDeBloque className="px-5 pt-4 pb-1">Dinero</TituloDeBloque>
      <dl className="divide-y">
        <Dato etiqueta="Recargado">
          {actividad
            ? actividad.charged.count > 0
              ? `${formatPrice(actividad.charged.amount, 'PEN')} · ${contar(actividad.charged.count, 'recarga', 'recargas')}`
              : 'Nunca'
            : ESPERA}
        </Dato>
        {actividad && actividad.refunded.count > 0 && (
          <Dato etiqueta="Devuelto">
            {formatPrice(actividad.refunded.amount, 'PEN')} ·{' '}
            {contar(actividad.refunded.count, 'devolución', 'devoluciones')}
          </Dato>
        )}
        {actividad && Number(actividad.granted_credits) !== 0 && (
          <Dato etiqueta="Créditos a mano">
            {formatCredits(actividad.granted_credits)} créditos
          </Dato>
        )}
        <Dato etiqueta="Consumido">
          {actividad ? `${formatCredits(actividad.consumed_credits)} créditos` : ESPERA}
        </Dato>
        <Dato etiqueta="Última recarga">
          {organizacion.last_topup_at
            ? formatDateTime(organizacion.last_topup_at)
            : 'Nunca'}
        </Dato>
        <Dato etiqueta="Recargas pendientes">{organizacion.pending_topups}</Dato>
        {actividad && actividad.disputed + actividad.charged_back > 0 && (
          <Dato etiqueta="Contracargos">
            <span className="text-destructive">
              {contar(actividad.disputed, 'abierto', 'abiertos')} ·{' '}
              {contar(actividad.charged_back, 'perdido', 'perdidos')}
            </span>
          </Dato>
        )}
      </dl>
    </section>
  )
}

export function UsageFacts({ organizacion, detalle, className }: Props) {
  const actividad = detalle?.activity

  return (
    <section className={className}>
      <TituloDeBloque className="px-5 pt-4 pb-1">Uso</TituloDeBloque>
      <dl className="divide-y">
        <Dato etiqueta="Servidores">{organizacion.servers_count}</Dato>
        <Dato etiqueta="Días con uso, último mes">
          {actividad ? actividad.days_used_recently : ESPERA}
        </Dato>
        <Dato etiqueta="Última terminal">
          {actividad ? (
            actividad.last_session_at ? (
              <span className="block">
                <span className="block">{formatRelative(actividad.last_session_at)}</span>
                <span className="text-muted-foreground block text-xs">
                  {formatDateTime(actividad.last_session_at)}
                </span>
              </span>
            ) : (
              'Nunca'
            )
          ) : (
            ESPERA
          )}
        </Dato>
      </dl>
    </section>
  )
}

export function AccountFacts({ organizacion, detalle, className }: Props) {
  const actividad = detalle?.activity
  const estado = describirEstadoDeOrganizacion(organizacion.status)

  return (
    <section className={className}>
      <TituloDeBloque className="px-5 pt-4 pb-1">Cuenta</TituloDeBloque>
      <dl className="divide-y">
        <Dato etiqueta="Estado">
          <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
        </Dato>
        <Dato etiqueta="Propietario">
          {organizacion.owner ? (
            <span className="block">
              <span className="block">{organizacion.owner.name}</span>
              <span className="text-muted-foreground block text-xs break-all">
                {organizacion.owner.email}
              </span>
              {actividad && !actividad.owner_email_verified && (
                <span className="text-warning block text-xs">Correo sin confirmar</span>
              )}
            </span>
          ) : (
            'Sin propietario'
          )}
        </Dato>
        <Dato etiqueta="Miembros">
          <span className="block">
            <span className="block">{organizacion.members_count}</span>
            {actividad && (
              <span className="text-muted-foreground block text-xs">
                {[
                  contar(actividad.owners, 'propietario', 'propietarios'),
                  contar(actividad.admins, 'administrador', 'administradores'),
                  contar(actividad.members, 'miembro', 'miembros'),
                ].join(' · ')}
              </span>
            )}
          </span>
        </Dato>
        <Dato etiqueta="Creada">{formatDateTime(organizacion.created_at)}</Dato>
      </dl>
    </section>
  )
}

export function TituloDeBloque({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3
      className={cn(
        'text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase',
        className,
      )}
    >
      {children}
    </h3>
  )
}

export function contar(cuantos: number, uno: string, varios: string): string {
  return `${cuantos} ${cuantos === 1 ? uno : varios}`
}
