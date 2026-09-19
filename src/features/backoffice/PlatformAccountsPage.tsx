import { useQuery } from '@tanstack/react-query'
import { CircleDotIcon, EyeIcon, SearchXIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'

import { ColumnasMenu } from '@/components/columns-menu'
import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { EmptyState, PageHeader } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/session'
import { AccountPanel } from '@/features/backoffice/AccountPanel'
import { AccountSecurity } from '@/features/backoffice/AccountSecurity'
import * as platformApi from '@/features/backoffice/api'
import { atiende } from '@/features/backoffice/permisos'
import { PersonIdentity } from '@/features/backoffice/PersonIdentity'
import { SinPermiso } from '@/features/backoffice/SinPermiso'
import { FechaCelda } from '@/features/credits/partes'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { PlatformAccount } from '@/types/api'

const TITULO = 'Cuentas'
const DESCRIPCION = 'Las personas: cómo protegen su cuenta y dónde están.'
const ESTADOS = [
  { valor: TODOS, etiqueta: 'Todas las cuentas' },
  { valor: 'active', etiqueta: 'Activas' },
  { valor: 'inactive', etiqueta: 'Desactivadas' },
  { valor: 'unverified', etiqueta: 'Sin confirmar el correo' },
]
const NADA = <span className="text-muted-foreground">—</span>

/** Cuentas por correo: su seguridad y ayuda para entrar, sin conocer su
 *  contraseña. */
export function PlatformAccountsPage() {
  const { user } = useSession()

  if (!atiende(user))
    return (
      <SinPermiso
        titulo={TITULO}
        descripcion={DESCRIPCION}
        permiso="can_attend_customers"
      />
    )

  return <Cuentas />
}

function Cuentas() {
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', status: '' },
    modulo: 'plataforma-cuentas',
    vistaPorDefecto: 'tabla',
  })
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [abierta, setAbierta] = useState<string | null>(null)

  const cuentas = useQuery({
    queryKey: platformApi.clavesPlataforma.cuentas(pagina, porPagina, listado.parametros),
    queryFn: () => platformApi.fetchAccounts(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const columnas: Columna<PlatformAccount>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'persona',
      header: 'Persona',
      rol: 'titulo',
      fija: true,
      ancho: '30%',
      lineas: 2,
      cell: (cuenta) => (
        <span className="flex min-w-0 items-center gap-2">
          <PersonIdentity persona={cuenta} className="flex-1" />
          {cuenta.is_platform_staff && (
            <Badge variant="outline" className="shrink-0 font-normal">
              Personal
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'seguridad',
      header: 'Seguridad',
      ancho: '18%',
      lineas: 2,
      prioridad: 1,
      cell: (cuenta) => <AccountSecurity persona={cuenta} />,
    },
    {
      key: 'organizaciones',
      header: 'Organizaciones',
      alineacion: 'derecha',
      desde: 'md',
      ancho: '13%',
      prioridad: 2,
      cell: (cuenta) => (
        <span className="tabular-nums">{cuenta.organizations_count}</span>
      ),
    },
    {
      key: 'ultimo_uso',
      header: 'Último uso',
      desde: 'lg',
      ancho: '16%',
      lineas: 2,
      prioridad: 3,
      cell: (cuenta) =>
        cuenta.last_seen_at ? <FechaCelda iso={cuenta.last_seen_at} /> : NADA,
    },
    {
      key: 'alta',
      header: 'Alta',
      porDefecto: false,
      ancho: '16%',
      lineas: 2,
      prioridad: 4,
      cell: (cuenta) => <FechaCelda iso={cuenta.date_joined} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 1,
      alineacion: 'centro',
      ancho: '9%',
      cell: (cuenta) => (
        /* Todo se hace desde la cuenta: un menú de una entrada sobra */
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ver la cuenta de ${cuenta.display_name}`}
              onClick={() => setAbierta(cuenta.id)}
            >
              <EyeIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ver cuenta</TooltipContent>
        </Tooltip>
      ),
    },
  ]
  const eleccion = useColumnas('plataforma-cuentas', columnas)

  return (
    <div className="space-y-6">
      <PageHeader title={TITULO} description={DESCRIPCION} />

      <div className="space-y-4">
        <FilterBar
          hayFiltros={listado.hayFiltros}
          cargando={cuentas.isFetching}
          onLimpiar={listado.limpiarFiltros}
          onActualizar={() => cuentas.refetch()}
          busqueda={
            <SearchInput
              valor={filtros.search}
              onChange={(valor) => setFiltro('search', valor)}
              placeholder="Buscar por correo o nombre"
              etiqueta="Buscar cuentas"
            />
          }
          derecha={
            <>
              <ColumnasMenu
                columnas={columnas}
                visibles={eleccion.visibles}
                onAlternar={eleccion.alternar}
                onRestablecer={eleccion.restablecer}
              />
              <PageSizeSelect
                valor={porPagina}
                onChange={(tamano) => {
                  setPorPagina(tamano)
                  setPagina(1)
                }}
              />
            </>
          }
        >
          <FiltroSelect
            icono={CircleDotIcon}
            etiqueta="Estado de la cuenta"
            valor={filtros.status || TODOS}
            onChange={(valor) => setFiltro('status', valor === TODOS ? '' : valor)}
            opciones={ESTADOS}
          />
        </FilterBar>

        <DataTable
          columnas={eleccion.elegidas}
          datos={cuentas.data?.results ?? []}
          getKey={(cuenta) => cuenta.id}
          vista="tabla"
          cargando={cuentas.isPending}
          error={cuentas.error}
          onReintentar={() => cuentas.refetch()}
          filasEsperadas={Math.min(porPagina, cuentas.data?.results.length || 5)}
          vacio={
            listado.hayFiltros ? (
              <EmptyState
                icon={SearchXIcon}
                title="Nadie con esos filtros"
                description="Pruebe con otro correo o estado, o límpielos."
              />
            ) : (
              <EmptyState
                icon={UsersIcon}
                title="Sin cuentas"
                description="Aparecen en cuanto alguien se registra."
              />
            )
          }
        />

        <Pagination
          pagina={pagina}
          total={cuentas.data?.count ?? 0}
          porPagina={porPagina}
          etiqueta="cuentas"
          onCambiar={setPagina}
        />
      </div>

      <AccountPanel
        cuentaId={abierta}
        open={abierta !== null}
        onOpenChange={(abierto) => !abierto && setAbierta(null)}
      />
    </div>
  )
}
