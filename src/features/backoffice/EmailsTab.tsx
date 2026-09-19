import { useQuery } from '@tanstack/react-query'
import {
  CircleDotIcon,
  EyeIcon,
  MailIcon,
  SearchXIcon,
  TagIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'

import { ColumnasMenu } from '@/components/columns-menu'
import { columnaDeNumero, DataTable, type Columna } from '@/components/data-table'
import {
  FilterBar,
  FiltroSelect,
  PageSizeSelect,
  SearchInput,
} from '@/components/filter-bar'
import { Pagination } from '@/components/pagination'
import { RowActions } from '@/components/row-actions'
import { EmptyState } from '@/components/states'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/session'
import { AccountPanel } from '@/features/backoffice/AccountPanel'
import * as platformApi from '@/features/backoffice/api'
import { EmailPanel } from '@/features/backoffice/EmailPanel'
import { describirIntentos, ESTADO_DEL_CORREO } from '@/features/backoffice/operaciones'
import { atiende } from '@/features/backoffice/permisos'
import { buildOperationsPath } from '@/features/backoffice/rutas'
import {
  EstadoBadge,
  FechaCelda,
  FiltroDePeriodo,
  usePeriodoDeListado,
} from '@/features/credits/partes'
import { TODOS } from '@/lib/opciones-de-filtro'
import { useColumnas } from '@/lib/use-columnas'
import { useListado } from '@/lib/use-listado'
import type { EmailDelivery, EmailStatus } from '@/types/api'

const ESTADOS = [
  { valor: TODOS, etiqueta: 'Todos los estados' },
  ...(Object.entries(ESTADO_DEL_CORREO) as [EmailStatus, { etiqueta: string }][]).map(
    ([valor, { etiqueta }]) => ({ valor, etiqueta }),
  ),
]

/** Correos enviados o fallidos y por qué. «No me llegó el código» se
 *  consulta aquí y se resuelve desde la cuenta de esa persona. */
export function EmailsTab() {
  const { user } = useSession()

  if (!atiende(user)) return <Navigate to={buildOperationsPath()} replace />

  return <Correos />
}

function Correos() {
  const [porPagina, setPorPagina] = useState(20)
  const listado = useListado({
    filtrosIniciales: { search: '', status: '', kind: '', from: '', to: '' },
    modulo: 'plataforma-correos',
    vistaPorDefecto: 'tabla',
    avanzados: ['kind', 'from', 'to'],
  })
  const periodo = usePeriodoDeListado(listado, 'todo')
  const { filtros, setFiltro, pagina, setPagina } = listado
  const [detalle, setDetalle] = useState<EmailDelivery | null>(null)
  const [cuenta, setCuenta] = useState<string | null>(null)

  const correos = useQuery({
    queryKey: platformApi.clavesPlataforma.correos(pagina, porPagina, listado.parametros),
    queryFn: () => platformApi.fetchEmails(pagina, porPagina, listado.parametros),
    placeholderData: (anterior) => anterior,
  })

  const abrirCuenta = (cuentaId: string) => {
    setDetalle(null)
    setCuenta(cuentaId)
  }

  const columnas: Columna<EmailDelivery>[] = [
    columnaDeNumero(pagina, porPagina),
    {
      key: 'created_at',
      header: 'Cuándo',
      prioridad: 1,
      ancho: '15%',
      lineas: 2,
      cell: (correo) => <FechaCelda iso={correo.created_at} />,
    },
    {
      key: 'kind',
      header: 'Correo',
      rol: 'titulo',
      fija: true,
      ancho: '30%',
      lineas: 2,
      cell: (correo) => (
        <span className="block min-w-0">
          <span className="block truncate text-sm">{correo.kind_label}</span>
          <span className="text-muted-foreground block truncate text-xs">
            Para {correo.destination}
          </span>
        </span>
      ),
    },
    {
      key: 'person',
      header: 'Cuenta',
      prioridad: 3,
      desde: 'lg',
      ancho: '20%',
      lineas: 2,
      cell: (correo) =>
        correo.person ? (
          <span className="block min-w-0">
            <span className="block truncate text-sm">{correo.person.name}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {correo.person.email}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      prioridad: 2,
      ancho: '18%',
      lineas: 2,
      cell: (correo) => {
        const estado = ESTADO_DEL_CORREO[correo.status]
        return (
          <span className="block min-w-0">
            <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
            {correo.status === 'fallida' ? (
              <span className="text-destructive mt-1 block truncate text-xs">
                {correo.error}
              </span>
            ) : (
              describirIntentos(correo.attempts) && (
                <span className="text-muted-foreground mt-1 block text-xs">
                  {describirIntentos(correo.attempts)}
                </span>
              )
            )}
          </span>
        )
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 2,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (correo) => (
        <RowActions
          etiqueta={`del correo a ${correo.destination}`}
          onVerDetalle={() => setDetalle(correo)}
        >
          <DropdownMenuItem onSelect={() => setDetalle(correo)}>
            <EyeIcon className="size-4" />
            Ver detalle
          </DropdownMenuItem>
          {correo.person && (
            <DropdownMenuItem onSelect={() => abrirCuenta(correo.person!.id)}>
              <UserIcon className="size-4" />
              Abrir su cuenta
            </DropdownMenuItem>
          )}
        </RowActions>
      ),
    },
  ]
  const eleccion = useColumnas('plataforma-correos', columnas)

  return (
    <div className="space-y-4">
      <FilterBar
        hayFiltros={listado.hayFiltros}
        cargando={correos.isFetching}
        onLimpiar={periodo.limpiar}
        onActualizar={() => correos.refetch()}
        busqueda={
          <SearchInput
            valor={filtros.search}
            onChange={(valor) => setFiltro('search', valor)}
            placeholder="Buscar por correo o nombre"
            etiqueta="Buscar en los correos"
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
        avanzadosActivos={listado.filtrosAvanzadosActivos}
        avanzados={
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de correo</Label>
              <FiltroSelect
                icono={TagIcon}
                etiqueta="Tipo de correo"
                className="w-full"
                valor={filtros.kind || TODOS}
                onChange={(valor) => setFiltro('kind', valor === TODOS ? '' : valor)}
                opciones={[
                  { valor: TODOS, etiqueta: 'Todos los tipos' },
                  ...(correos.data?.kinds ?? []).map((tipo) => ({
                    valor: tipo.value,
                    etiqueta: tipo.label,
                  })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Periodo</Label>
              <FiltroDePeriodo
                className="w-full"
                periodo={periodo.periodo}
                rango={periodo.rango}
                onChange={periodo.cambiar}
              />
            </div>
          </>
        }
      >
        <FiltroSelect
          icono={CircleDotIcon}
          etiqueta="Estado"
          valor={filtros.status || TODOS}
          onChange={(valor) => setFiltro('status', valor === TODOS ? '' : valor)}
          opciones={ESTADOS}
        />
      </FilterBar>

      <DataTable
        columnas={eleccion.elegidas}
        datos={correos.data?.results ?? []}
        getKey={(correo) => correo.id}
        vista="tabla"
        cargando={correos.isPending}
        error={correos.error}
        onReintentar={() => correos.refetch()}
        filasEsperadas={Math.min(porPagina, correos.data?.results.length || 3)}
        vacio={
          listado.hayFiltros ? (
            <EmptyState
              icon={SearchXIcon}
              title="Ningún correo con esos filtros"
              description="Pruebe con otro estado, otro tipo u otro periodo."
            />
          ) : (
            <EmptyState
              icon={MailIcon}
              title="Sin correos todavía"
              description="Aquí queda cada correo que manda la plataforma y cómo acabó."
            />
          )
        }
      />

      <Pagination
        pagina={pagina}
        total={correos.data?.count ?? 0}
        porPagina={porPagina}
        etiqueta="correos"
        onCambiar={setPagina}
      />

      <EmailPanel
        correo={detalle}
        open={detalle !== null}
        onOpenChange={(abierto) => !abierto && setDetalle(null)}
        onAbrirCuenta={abrirCuenta}
      />

      <AccountPanel
        cuentaId={cuenta}
        open={cuenta !== null}
        onOpenChange={(abierto) => !abierto && setCuenta(null)}
      />
    </div>
  )
}
