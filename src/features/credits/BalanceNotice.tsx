import { cn } from 'cn'
import { AlertTriangleIcon } from 'lucide-react'
import { Link, useMatch } from 'react-router'

import { Button } from '@/components/ui/button'
import { describirSaldo } from '@/features/credits/saldo'
import { useSaldo } from '@/features/credits/use-creditos'
import { useCurrentOrganization } from '@/features/organizations/current'

/** Aviso de saldo sobre cualquier pantalla, solo si pide acción. «Se
 *  acaba», a quien puede recargar; «se acabó», a todos: cambia qué
 *  terminales abren. */
export function BalanceNotice() {
  const { slug, organization } = useCurrentOrganization()
  const saldo = useSaldo(slug)
  // En Créditos ya lo dice la cifra del saldo
  const enCreditos = useMatch('/app/credits/*')

  if (!saldo.data || enCreditos) return null

  const administra = organization?.role === 'owner' || organization?.role === 'admin'
  const { detalle, tono } = describirSaldo(saldo.data)
  if (tono === 'normal' || (tono === 'aviso' && !administra)) return null

  const peligro = tono === 'peligro'

  return (
    <div
      role="status"
      className={cn(
        'mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-3',
        peligro
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-warning/40 bg-warning/10',
      )}
    >
      <AlertTriangleIcon
        className={cn('size-4 shrink-0', peligro ? 'text-destructive' : 'text-warning')}
      />
      <p className="min-w-0 flex-1 text-sm">
        {detalle}
        {!administra && ' Avise a quien administra la organización.'}
      </p>
      {administra && (
        <Button asChild variant="outline" size="sm">
          <Link to="/app/credits">Recargar</Link>
        </Button>
      )}
    </div>
  )
}
