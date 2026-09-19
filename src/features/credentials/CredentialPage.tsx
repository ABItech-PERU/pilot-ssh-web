import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  FolderIcon,
  KeyRoundIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  TagIcon,
  TerminalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { TabNav } from '@/components/tab-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LineaEsqueleto } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { CredentialAccessSheet } from '@/features/access/CredentialAccessSheet'
import { accionDeAcceso, puedeConectar, puedeGestionar } from '@/features/access/levels'
import * as credentialsApi from '@/features/credentials/api'
import { buildCredentialPath } from '@/features/credentials/paths'
import { canManage, useCurrentOrganization } from '@/features/organizations/current'
import * as serversApi from '@/features/servers/api'
import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import { CredentialFormDialog } from '@/features/servers/CredentialFormDialog'
import { CredentialLabelsDialog } from '@/features/servers/CredentialLabelsDialog'
import { describeCredentialLoss } from '@/features/servers/deletion'
import { LabelChips } from '@/features/servers/LabelChips'
import { LinkChips } from '@/features/servers/LinkChips'
import { CredentialLinksSheet } from '@/features/servers/LinksSheet'
import { buildServerPath } from '@/features/servers/paths'
import { Metrica } from '@/features/servers/server-parts'
import { buildTerminalPath } from '@/features/terminal/socket'
import { toApiError } from '@/lib/api-error'
import { formatDateTime, formatRelative } from '@/lib/format'
import { isUuid } from '@/lib/ids'
import type { ServerUser } from '@/types/api'

/** Distinta a propósito de la del servidor (usuario en monoespacio, ficha
 *  fija, pestañas en el panel): confundirlas abre la terminal equivocada.
 *  Cada pestaña es ruta hija y recibe la credencial por el Outlet. */
export function CredentialPage() {
  const { credentialId = '' } = useParams()
  const navegar = useNavigate()
  const { organization } = useCurrentOrganization()
  const cliente = useQueryClient()
  const [editando, setEditando] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [enlacesAbiertos, setEnlacesAbiertos] = useState(false)
  const [etiquetasAbiertas, setEtiquetasAbiertas] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const { hash } = useLocation()
  const panel = useRef<HTMLElement | null>(null)

  const detalle = useQuery({
    queryKey: credentialsApi.clavesCredencial.detalle(credentialId),
    queryFn: () => credentialsApi.fetchCredential(credentialId),
    enabled: isUuid(credentialId),
  })

  // #sesiones: en móvil el panel queda bajo la ficha; se desplaza hasta él
  useEffect(() => {
    if (hash === '#sesiones' && !detalle.isPending) {
      panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, detalle.isPending])

  const eliminar = useMutation({
    mutationFn: serversApi.deleteCredential,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['servers'] })
      await cliente.invalidateQueries({ queryKey: ['credentials'] })
      toast.success('Credencial eliminada.')
      navegar('/app/credentials')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  if (!isUuid(credentialId) || detalle.isError) return <NoEncontrada />
  if (detalle.isPending) return <Esqueleto credentialId={credentialId} />

  const credencial = detalle.data
  const forma = FORMAS_DE_ENTRAR[credencial.auth_type]
  // Editar o borrar exige gestionar su servidor; si no, no se ofrece (403)
  const gestiona = puedeGestionar(credencial)
  const puedeRepartir = canManage(organization)
  const { etiqueta: accesos, icono: IconoDeAccesos } = accionDeAcceso(puedeRepartir)

  return (
    <div className="space-y-6">
      <VolverACredenciales />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
            <forma.icono className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="font-machine text-xl font-semibold break-words">
              {credencial.username}
              <Badge variant="secondary" className="ml-2 align-middle font-normal">
                {forma.nombre}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              En{' '}
              <Link
                to={buildServerPath(credencial.server)}
                className="text-foreground hover:underline"
              >
                {credencial.server_name}
              </Link>{' '}
              · <span className="font-machine">{credencial.server_ip}</span>
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setCompartiendo(true)}>
            <IconoDeAccesos />
            {accesos}
          </Button>
          {gestiona && (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <PencilIcon />
              Editar
            </Button>
          )}
          {puedeConectar(credencial) && (
            <Button
              onClick={() => navegar(buildTerminalPath(credencial.server, credencial.id))}
            >
              <TerminalIcon />
              Abrir terminal
            </Button>
          )}
          {gestiona && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Más acciones de ${credencial.username}`}
                >
                  <MoreVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEnlacesAbiertos(true)}>
                  <LinkIcon className="size-4" />
                  Enlaces
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEtiquetasAbiertas(true)}>
                  <TagIcon className="size-4" />
                  Etiquetas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setBorrando(true)}
                >
                  <Trash2Icon className="size-4" />
                  Eliminar credencial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <Metricas credencial={credencial} />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
        <Ficha
          credencial={credencial}
          gestiona={gestiona}
          onEnlaces={() => setEnlacesAbiertos(true)}
          onEtiquetas={() => setEtiquetasAbiertas(true)}
        />

        <section id="sesiones" ref={panel} className="min-w-0 scroll-mt-6 space-y-4">
          <TabNav
            etiqueta="Secciones de la credencial"
            pestanas={[
              {
                to: buildCredentialPath(credencial.id),
                etiqueta: 'Sesiones',
                cuenta: credencial.total_sessions,
                end: true,
              },
              {
                to: buildCredentialPath(credencial.id, 'stats'),
                etiqueta: 'Estadísticas',
                end: true,
              },
            ]}
          />
          <Outlet context={credencial} />
        </section>
      </div>

      <CredentialFormDialog
        server={{ id: credencial.server, name: credencial.server_name }}
        credential={credencial}
        open={editando}
        onOpenChange={setEditando}
      />
      <CredentialLabelsDialog
        credential={credencial}
        open={etiquetasAbiertas}
        onOpenChange={setEtiquetasAbiertas}
      />
      <CredentialLinksSheet
        credential={credencial}
        open={enlacesAbiertos}
        onOpenChange={setEnlacesAbiertos}
      />
      <CredentialAccessSheet
        credencial={credencial}
        open={compartiendo}
        onOpenChange={setCompartiendo}
        puedeRepartir={puedeRepartir}
      />
      <ConfirmDialog
        open={borrando}
        onOpenChange={setBorrando}
        titulo={`¿Eliminar ${credencial.username}?`}
        descripcion={`Deja de estar en ${credencial.server_name}.`}
        detalles={describeCredentialLoss(credencial)}
        confirmacion={credencial.username}
        accion="Eliminar credencial"
        destructiva
        pendiente={eliminar.isPending}
        onConfirmar={() => eliminar.mutate(credencial.id)}
      />
    </div>
  )
}

/** Totales históricos; el periodo se elige en «Estadísticas». */
function Metricas({ credencial }: { credencial: ServerUser }) {
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
      <Metrica etiqueta="Sesiones" valor={String(credencial.total_sessions)} />
      <Metrica etiqueta="Personas" valor={String(credencial.people_count)} />
      <Metrica
        etiqueta="Último uso"
        valor={formatRelative(credencial.last_used_at)}
        exacto={formatDateTime(credencial.last_used_at)}
      />
      <Metrica etiqueta="Media" valor={credencial.average_session_time} />
    </div>
  )
}

/** Etiquetas y enlaces se editan desde aquí. */
function Ficha({
  credencial,
  onEnlaces,
  onEtiquetas,
  gestiona,
}: {
  credencial: ServerUser
  onEnlaces: () => void
  onEtiquetas: () => void
  gestiona: boolean
}) {
  const conEtiquetas = Object.keys(credencial.labels).length > 0

  return (
    <dl className="divide-y rounded-lg border">
      <Dato
        etiqueta="Etiquetas"
        accion={
          gestiona && (
            <Button variant="ghost" size="xs" onClick={onEtiquetas}>
              {conEtiquetas ? 'Editar' : 'Añadir'}
            </Button>
          )
        }
      >
        {conEtiquetas ? (
          <LabelChips labels={credencial.labels} />
        ) : (
          <span className="text-muted-foreground">Ninguna</span>
        )}
      </Dato>
      <Dato etiqueta="Carpeta de trabajo">
        {credencial.working_directory ? (
          <span className="font-machine flex items-start gap-1.5 break-all">
            <FolderIcon className="mt-0.5 size-3.5 shrink-0" />
            {credencial.working_directory}
          </span>
        ) : (
          <span className="text-muted-foreground">La carpeta de inicio</span>
        )}
      </Dato>
      <Dato
        etiqueta="Enlaces"
        accion={
          gestiona && (
            <Button variant="ghost" size="xs" onClick={onEnlaces}>
              {credencial.links.length > 0 ? 'Editar' : 'Añadir'}
            </Button>
          )
        }
      >
        <LinkChips links={credencial.links} vacio="Ninguno" />
      </Dato>
      {credencial.notes && (
        <Dato etiqueta="Notas">
          <p className="whitespace-pre-line">{credencial.notes}</p>
        </Dato>
      )}
      <Dato etiqueta="Alta">
        <span className="block" title={formatDateTime(credencial.created_at)}>
          {formatDateTime(credencial.created_at)}
        </span>
        <span className="text-muted-foreground block text-xs">
          {credencial.created_by_name
            ? `Por ${credencial.created_by_name}`
            : 'No consta quién la dio de alta'}
        </span>
      </Dato>
      <Dato etiqueta="Último cambio">
        <span title={formatDateTime(credencial.updated_at)}>
          {formatRelative(credencial.updated_at)}
        </span>
      </Dato>
    </dl>
  )
}

function Dato({
  etiqueta,
  accion,
  children,
}: {
  etiqueta: string
  accion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase">
          {etiqueta}
        </dt>
        {accion}
      </div>
      <dd className="mt-1.5 text-sm">{children}</dd>
    </div>
  )
}

function NoEncontrada() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
        <KeyRoundIcon className="size-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">No encontramos esta credencial</h1>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Puede que ya no tengas acceso o que el enlace esté mal.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/app/credentials">
          <ArrowLeftIcon />
          Volver a credenciales
        </Link>
      </Button>
    </div>
  )
}

function VolverACredenciales() {
  return (
    <Link
      to="/app/credentials"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeftIcon className="size-4" />
      Credenciales
    </Link>
  )
}

/** Lo fijo, real; lo de la API, barras de su alto. */
function Esqueleto({ credentialId }: { credentialId: string }) {
  return (
    <div className="space-y-6" aria-busy>
      <VolverACredenciales />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 space-y-1">
            <LineaEsqueleto texto="xl" className="w-48" />
            <LineaEsqueleto className="w-40" />
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="size-9" />
        </div>
      </header>

      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
        {['Sesiones', 'Personas', 'Último uso', 'Media'].map((etiqueta) => (
          <Metrica key={etiqueta} etiqueta={etiqueta} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
        <dl className="divide-y rounded-lg border">
          <Dato etiqueta="Etiquetas">
            <LineaEsqueleto className="w-20" />
          </Dato>
          <Dato etiqueta="Carpeta de trabajo">
            <LineaEsqueleto className="w-48" />
          </Dato>
          <Dato etiqueta="Enlaces">
            <LineaEsqueleto className="w-24" />
          </Dato>
          <Dato etiqueta="Alta">
            <LineaEsqueleto className="w-32" />
            <LineaEsqueleto texto="xs" className="w-40" />
          </Dato>
          <Dato etiqueta="Último cambio">
            <LineaEsqueleto className="w-24" />
          </Dato>
        </dl>

        <section className="min-w-0 space-y-4">
          <TabNav
            etiqueta="Secciones de la credencial"
            pestanas={[
              {
                to: buildCredentialPath(credentialId),
                etiqueta: 'Sesiones',
                cuentaPendiente: true,
                end: true,
              },
              {
                to: buildCredentialPath(credentialId, 'stats'),
                etiqueta: 'Estadísticas',
                end: true,
              },
            ]}
          />
          <Skeleton className="h-72 w-full rounded-lg" />
        </section>
      </div>
    </div>
  )
}
