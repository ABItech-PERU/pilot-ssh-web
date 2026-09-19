import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  MoreVerticalIcon,
  PencilIcon,
  ServerOffIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { TabNav } from '@/components/tab-nav'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { AccessSheet } from '@/features/access/AccessSheet'
import { accionDeAcceso, puedeGestionar } from '@/features/access/levels'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { LabelChips } from '@/features/servers/LabelChips'
import { describeServerLoss } from '@/features/servers/deletion'
import { buildServerPath, type PestanaServidor } from '@/features/servers/paths'
import {
  AbrirTerminal,
  CopiarDireccion,
  Metricas,
  VerificadoBadge,
} from '@/features/servers/server-parts'
import { ServerFormDialog } from '@/features/servers/ServerFormDialog'
import * as accessApi from '@/features/access/api'
import { toApiError } from '@/lib/api-error'
import { isUuid } from '@/lib/ids'
import type { Server } from '@/types/api'

interface Pestana {
  etiqueta: string
  pestana?: PestanaServidor
  /** `accesos` no viene con el servidor: se consulta aparte. */
  cuenta: (server: Server, accesos: number | null) => number | null
}

const PESTANAS: Pestana[] = [
  { etiqueta: 'Resumen', cuenta: () => null },
  {
    etiqueta: 'Credenciales',
    pestana: 'credentials',
    cuenta: (server) => server.users.length,
  },
  { etiqueta: 'Enlaces', pestana: 'links', cuenta: (server) => server.links.length },
  // Lineas de la pestana: concesiones mas administradores (entran por rol)
  { etiqueta: 'Accesos', pestana: 'access', cuenta: (_server, accesos) => accesos },
  {
    etiqueta: 'Sesiones',
    pestana: 'sessions',
    cuenta: (server) => server.total_sessions,
  },
  // Sin cuenta: no es una lista
  { etiqueta: 'Estadísticas', pestana: 'stats', cuenta: () => null },
]

/** Cada pestana es ruta hija y recibe el servidor por el Outlet: ninguna
 *  vuelve a pedirlo ni resuelve la carga. */
export function ServerPage() {
  const { serverId = '' } = useParams()
  const navegar = useNavigate()
  const cliente = useQueryClient()
  const { organization } = useCurrentOrganization()
  const [editando, setEditando] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const detalle = useQuery({
    queryKey: serversApi.clavesServidor.detalle(serverId),
    queryFn: () => serversApi.fetchServer(serverId),
    enabled: isUuid(serverId),
  })

  // Misma clave que la pestana y «Compartir»: sin peticion extra
  const acceso = useQuery({
    queryKey: accessApi.clavesAcceso.delServidor(serverId),
    queryFn: () => accessApi.fetchServerAccess(serverId),
    enabled: isUuid(serverId),
  })
  const accesos = acceso.data
    ? acceso.data.managers.length + acceso.data.grants.length
    : null

  const eliminar = useMutation({
    mutationFn: serversApi.deleteServer,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      toast.success('Servidor eliminado.')
      navegar('/app/servers')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  if (!isUuid(serverId) || detalle.isError) return <NoEncontrado />
  if (detalle.isPending) return <Esqueleto />

  const server = detalle.data
  // Editar y eliminar solo quien gestiona la maquina; si no, daria 403
  const gestiona = puedeGestionar(server)
  const puedeRepartir = canManage(organization)
  const { etiqueta: etiquetaDeAccesos, icono: IconoDeAccesos } =
    accionDeAcceso(puedeRepartir)

  return (
    <div className="space-y-6">
      <Link
        to="/app/servers"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Servidores
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight break-words">
            {server.name}
            <VerificadoBadge server={server} />
          </h1>
          <CopiarDireccion valor={`${server.ip}:${server.port}`} />
          <LabelChips labels={server.labels} className="pt-1" />
        </div>

        {/* En movil se doblan: cuatro botones no caben en 390 px */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setCompartiendo(true)}>
            <IconoDeAccesos />
            {etiquetaDeAccesos}
          </Button>
          {gestiona && (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <PencilIcon />
              Editar
            </Button>
          )}
          <AbrirTerminal server={server} />
          {gestiona && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Más acciones de ${server.name}`}
                >
                  <MoreVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setBorrando(true)}
                >
                  <Trash2Icon className="size-4" />
                  Eliminar servidor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <Metricas server={server} />

      <TabNav
        etiqueta="Secciones del servidor"
        pestanas={PESTANAS.map(({ etiqueta, pestana, cuenta }) => ({
          to: buildServerPath(server.id, pestana),
          etiqueta,
          cuenta: cuenta(server, accesos),
          end: true,
        }))}
      />

      <Outlet context={server} />

      <ServerFormDialog open={editando} onOpenChange={setEditando} server={server} />

      <AccessSheet
        server={server}
        open={compartiendo}
        onOpenChange={setCompartiendo}
        puedeRepartir={puedeRepartir}
      />

      <ConfirmDialog
        open={borrando}
        onOpenChange={setBorrando}
        titulo={`¿Eliminar ${server.name}?`}
        descripcion="Solo se borra de Pilot SSH. Su servidor sigue funcionando igual."
        detalles={describeServerLoss(server)}
        confirmacion={server.name}
        accion="Eliminar servidor"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => eliminar.mutate(server.id)}
      />
    </div>
  )
}

/** Inexistente o sin acceso: el backend no distingue y la pantalla tampoco. */
function NoEncontrado() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
        <ServerOffIcon className="size-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">No encontramos este servidor</h1>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Puede que ya no tengas acceso o que el enlace esté mal.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/app/servers">
          <ArrowLeftIcon />
          Volver a servidores
        </Link>
      </Button>
    </div>
  )
}

/** Misma forma que la pagina cargada: sin saltos al llegar los datos. */
function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-5 w-24" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <Skeleton className="h-[74px] w-full rounded-lg" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}
