import { cn } from 'cn'

import { Revelar } from '@/components/revelar'
import { Skeleton } from '@/components/ui/skeleton'
import { contar, describirTarifa, formatSoles } from '@/features/sitio/precios'
import { usePrecios } from '@/features/sitio/use-sitio'
import { formatCredits } from '@/lib/format'

/** Las cuatro cifras del precio, leídas de las tarifas reales. */
export function TarifasResumen({ className }: { className?: string }) {
  const { data: precios } = usePrecios()

  if (!precios) return <Skeleton className={cn('h-32 max-w-5xl rounded-lg', className)} />

  const persona = describirTarifa(precios, 'member')
  const servidor = describirTarifa(precios, 'server')
  const tarifas = [
    {
      titulo: 'Gratis cada día',
      cifra: 'S/ 0',
      detalle: `${contar(persona.gratis, 'persona', 'personas')} y ${contar(servidor.gratis, 'servidor', 'servidores')}`,
    },
    {
      titulo: 'Por persona',
      cifra: formatSoles(persona.soles),
      unidad: '/ día',
      detalle: 'Solo el día que abre una terminal',
    },
    {
      titulo: 'Por servidor',
      cifra: formatSoles(servidor.soles),
      unidad: '/ día',
      detalle: 'Solo el día que alguien entra',
    },
    {
      titulo: 'De regalo',
      cifra: `${formatCredits(precios.welcome_bonus)} créditos`,
      detalle: 'Al confirmar su correo',
    },
  ]

  return (
    // Líneas de la rejilla = fondo entre celdas: valen a cualquier ancho
    <Revelar className={className}>
      <dl className="bg-border grid max-w-5xl gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4">
        {tarifas.map(({ titulo, cifra, unidad, detalle }) => (
          <div key={titulo} className="bg-background p-5">
            <dt className="text-muted-foreground text-sm font-medium">{titulo}</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight">
              {cifra}
              {unidad && (
                <span className="text-muted-foreground text-sm font-normal">
                  {' '}
                  {unidad}
                </span>
              )}
            </dd>
            <dd className="text-muted-foreground mt-1.5 text-sm">{detalle}</dd>
          </div>
        ))}
      </dl>
    </Revelar>
  )
}
