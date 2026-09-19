import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, PackageIcon, ReceiptIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { DataTable, type Columna } from '@/components/data-table'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import * as platformApi from '@/features/backoffice/api'
import { useCaso } from '@/features/backoffice/caso'
import { TituloDeBloque } from '@/features/backoffice/OrganizationFacts'
import { llevaFinanzas } from '@/features/backoffice/permisos'
import { PlatformTopUpPanel } from '@/features/backoffice/PlatformTopUpPanel'
import { buildPlatformPath } from '@/features/backoffice/rutas'
import { autorDe, conceptoDe } from '@/features/credits/movimientos'
import { EstadoBadge, FechaCelda, Importe } from '@/features/credits/partes'
import { describirRecarga } from '@/features/credits/recargas'
import { formatCredits, formatPrice } from '@/lib/format'
import type { PlatformTopUp, PlatformTransaction } from '@/types/api'

const POR_PAGINA = 5

/** Recargas y libro mayor del cliente, visibles para quien lleva su caso.
 *  La facturación global sigue siendo de finanzas. */
export function CaseMoneyTab() {
  const organizacion = useCaso()
  const { user } = useSession()
  const finanzas = llevaFinanzas(user)
  const filtro = { organization: organizacion.slug }

  return (
    // Apiladas: lado a lado, la fecha se partiría en tres líneas
    <div className="space-y-8">
      <Recargas slug={organizacion.slug} conEnlace={finanzas} filtro={filtro} />
      <Movimientos slug={organizacion.slug} conEnlace={finanzas} filtro={filtro} />
    </div>
  )
}

interface BloqueProps {
  slug: string
  /** Finanzas salta a la sección entera, acotada a esta organización. */
  conEnlace: boolean
  filtro: { organization: string }
}

function Recargas({ slug, conEnlace, filtro }: BloqueProps) {
  const [pagina, setPagina] = useState(1)
  const [abierta, setAbierta] = useState<PlatformTopUp | null>(null)
  const recargas = useQuery({
    queryKey: platformApi.clavesPlataforma.recargas(pagina, POR_PAGINA, filtro),
    queryFn: () => platformApi.fetchTopUps(pagina, POR_PAGINA, filtro),
    placeholderData: (anterior) => anterior,
  })

  const columnas: Columna<PlatformTopUp>[] = [
    {
      key: 'paquete',
      header: 'Paquete',
      rol: 'titulo',
      ancho: '40%',
      lineas: 2,
      cell: (solicitud) => (
        <button
          type="button"
          className="block min-w-0 text-left hover:underline"
          onClick={() => setAbierta(solicitud)}
        >
          <span className="block truncate font-medium">{solicitud.package_name}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {formatCredits(solicitud.credits)} créditos
          </span>
        </button>
      ),
    },
    {
      key: 'importe',
      header: 'Importe',
      alineacion: 'derecha',
      ancho: '20%',
      cell: (solicitud) => (
        <span className="tabular-nums">
          {formatPrice(solicitud.price_amount, solicitud.price_currency)}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      ancho: '20%',
      cell: (solicitud) => {
        const estado = describirRecarga(solicitud)
        return <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
      },
    },
    {
      key: 'fecha',
      header: 'Pedida',
      ancho: '20%',
      lineas: 2,
      cell: (solicitud) => <FechaCelda iso={solicitud.created_at} />,
    },
  ]

  return (
    <section className="space-y-3">
      <Cabecera
        titulo="Recargas"
        enlace={conEnlace ? buildPlatformPath('topups', slug) : null}
      />
      <DataTable
        columnas={columnas}
        datos={recargas.data?.results ?? []}
        getKey={(solicitud) => solicitud.id}
        vista="tabla"
        cargando={recargas.isPending}
        error={recargas.error}
        onReintentar={() => recargas.refetch()}
        filasEsperadas={POR_PAGINA}
        vacio={
          <EmptyState
            icon={PackageIcon}
            title="Sin recargas"
            description="Esta organización todavía no ha recargado."
          />
        }
      />
      <Pagination
        pagina={pagina}
        total={recargas.data?.count ?? 0}
        porPagina={POR_PAGINA}
        etiqueta="recargas"
        onCambiar={setPagina}
      />
      <PlatformTopUpPanel
        solicitud={abierta}
        open={abierta !== null}
        onOpenChange={(abierto) => !abierto && setAbierta(null)}
      />
    </section>
  )
}

function Movimientos({ slug, conEnlace, filtro }: BloqueProps) {
  const [pagina, setPagina] = useState(1)
  const movimientos = useQuery({
    queryKey: platformApi.clavesPlataforma.movimientos(pagina, POR_PAGINA, filtro),
    queryFn: () => platformApi.fetchTransactions(pagina, POR_PAGINA, filtro),
    placeholderData: (anterior) => anterior,
  })

  const columnas: Columna<PlatformTransaction>[] = [
    {
      key: 'concepto',
      header: 'Concepto',
      rol: 'titulo',
      ancho: '44%',
      lineas: 2,
      cell: (movimiento) => {
        const autor = autorDe(movimiento)
        return (
          <span className="block min-w-0">
            <span className="block truncate">{conceptoDe(movimiento)}</span>
            {autor && (
              <span className="text-muted-foreground block truncate text-xs">
                Por {autor}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'importe',
      header: 'Créditos',
      alineacion: 'derecha',
      ancho: '18%',
      cell: (movimiento) => <Importe cantidad={movimiento.amount} />,
    },
    {
      key: 'saldo',
      header: 'Saldo',
      alineacion: 'derecha',
      ancho: '18%',
      cell: (movimiento) => (
        <span className="text-muted-foreground tabular-nums">
          {formatCredits(movimiento.balance_after)}
        </span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      ancho: '20%',
      lineas: 2,
      cell: (movimiento) => <FechaCelda iso={movimiento.created_at} />,
    },
  ]

  return (
    <section className="space-y-3">
      <Cabecera
        titulo="Movimientos"
        enlace={conEnlace ? buildPlatformPath('transactions', slug) : null}
      />
      <DataTable
        columnas={columnas}
        datos={movimientos.data?.results ?? []}
        getKey={(movimiento) => movimiento.id}
        vista="tabla"
        cargando={movimientos.isPending}
        error={movimientos.error}
        onReintentar={() => movimientos.refetch()}
        filasEsperadas={POR_PAGINA}
        vacio={
          <EmptyState
            icon={ReceiptIcon}
            title="Sin movimientos"
            description="Aquí aparece cada crédito que entra o se gasta."
          />
        }
      />
      <Pagination
        pagina={pagina}
        total={movimientos.data?.count ?? 0}
        porPagina={POR_PAGINA}
        etiqueta="movimientos"
        onCambiar={setPagina}
      />
    </section>
  )
}

function Cabecera({ titulo, enlace }: { titulo: string; enlace: string | null }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <TituloDeBloque>{titulo}</TituloDeBloque>
      {enlace && (
        <Button asChild variant="ghost" size="sm">
          <Link to={enlace}>
            Ver todo
            <ArrowRightIcon />
          </Link>
        </Button>
      )}
    </div>
  )
}
