import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClockIcon, PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FormDialogContent } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/format'
import * as accessApi from '@/features/access/api'
import { ExpiryField } from '@/features/access/ExpiryField'
import { NIVELES, NIVELES_EN_ORDEN } from '@/features/access/levels'
import { describirAlcance, ICONO_DEL_ALCANCE } from '@/features/access/scope'
import { OpcionConIcono } from '@/features/access/OpcionConIcono'
import * as serversApi from '@/features/servers/api'
import { contarUso, describirEtiqueta, describirUso } from '@/features/servers/labels'
import { toApiError } from '@/lib/api-error'
import type { AccessGrant, AccessGroup, AccessLevel } from '@/types/api'

type Alcance = 'organization' | 'label' | 'server' | 'credential'

interface Props {
  slug: string
  grupo: AccessGroup | null
  concesiones: AccessGrant[]
  onOpenChange: (open: boolean) => void
}

/** Alcance del grupo: lo que tiene y lo que se añade. Aparte de la lista
 *  de miembros. */
export function GroupAccessDialog({ slug, grupo, concesiones, onOpenChange }: Props) {
  if (!grupo) return null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Accesos de {grupo.name}</DialogTitle>
          <DialogDescription>
            A qué servidores da entrada, y con qué nivel.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y rounded-lg border">
          {concesiones.length === 0 ? (
            <p className="text-muted-foreground p-3 text-sm">
              Todavía no alcanza ningún servidor.
            </p>
          ) : (
            concesiones.map((concesion) => (
              <Concesion key={concesion.id} slug={slug} concesion={concesion} />
            ))
          )}
        </div>

        <Formulario slug={slug} grupo={grupo} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

/** Nivel editable en su sitio: cambiarlo conserva la caducidad. */
function Concesion({ slug, concesion }: { slug: string; concesion: AccessGrant }) {
  const cliente = useQueryClient()
  const Icono = ICONO_DEL_ALCANCE[concesion.scope]
  const alcance = describirAlcance(concesion)

  // Misma clave que el formulario de abajo: sin peticion extra
  const catalogo = useQuery({
    queryKey: serversApi.clavesServidor.catalogo(slug),
    queryFn: () => serversApi.fetchLabelCatalog(slug),
    enabled: concesion.scope === 'label',
  })

  // Cuantas maquinas llevan la etiqueta: da la medida del acceso
  const puesta = (catalogo.data ?? []).find(
    (definicion) => definicion.key === concesion.label_key,
  )?.usage.values[concesion.label_value]

  const refrescar = () => accessApi.invalidarAcceso(cliente)

  const cambiar = useMutation({
    mutationFn: (nivel: AccessLevel) =>
      accessApi.grant({
        organization: slug,
        group: concesion.group ?? undefined,
        server: concesion.server ?? undefined,
        server_user: concesion.server_user ?? undefined,
        label_key: concesion.label_key || undefined,
        label_value: concesion.label_value || undefined,
        level: nivel,
        expires_at: concesion.expires_at,
      }),
    onSuccess: refrescar,
    onError: (error) => toast.error(toApiError(error).message),
  })

  const quitar = useMutation({
    mutationFn: () => accessApi.revoke(concesion.id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Acceso retirado del grupo.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <div className="flex items-center gap-2 p-2 pl-3">
      <Icono className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{alcance}</span>
        {concesion.scope === 'label' && contarUso(puesta) > 0 && (
          <span className="text-muted-foreground block truncate text-xs">
            {describirUso(puesta)}
          </span>
        )}
        {concesion.expires_at && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <CalendarClockIcon className="size-3 shrink-0" />
            {concesion.is_expired
              ? 'Caducó'
              : `Hasta el ${formatDate(concesion.expires_at)}`}
          </span>
        )}
      </span>

      <Select
        value={concesion.level}
        onValueChange={(valor) => cambiar.mutate(valor as AccessLevel)}
      >
        <SelectTrigger
          size="sm"
          className="w-36 shrink-0"
          aria-label={`Nivel del acceso a ${alcance}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NIVELES_EN_ORDEN.map((clave) => (
            <OpcionConIcono key={clave} valor={clave} icono={NIVELES[clave].icono}>
              {NIVELES[clave].etiqueta}
            </OpcionConIcono>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Quitar el acceso a ${alcance}`}
        disabled={quitar.isPending}
        onClick={() => quitar.mutate()}
      >
        <XIcon />
      </Button>
    </div>
  )
}

function Formulario({ slug, grupo }: { slug: string; grupo: AccessGroup }) {
  const cliente = useQueryClient()
  const [alcance, setAlcance] = useState<Alcance>('organization')
  const [etiqueta, setEtiqueta] = useState('')
  const [servidor, setServidor] = useState('')
  const [credencial, setCredencial] = useState('')
  const [nivel, setNivel] = useState<AccessLevel>('connect')
  const [caduca, setCaduca] = useState('')

  const catalogo = useQuery({
    queryKey: serversApi.clavesServidor.catalogo(slug),
    queryFn: () => serversApi.fetchLabelCatalog(slug),
  })

  const servidores = useQuery({
    queryKey: serversApi.clavesServidor.todos({ organization: slug, page_size: 100 }),
    queryFn: () => serversApi.fetchServers({ organization: slug, page_size: 100 }),
    enabled: alcance === 'server' || alcance === 'credential',
  })

  // Sin etiquetas definidas, el alcance por etiqueta queda inactivo
  const parejas = (catalogo.data ?? []).flatMap((definicion) =>
    definicion.values.map((valor) => `${definicion.key}:${valor}`),
  )

  useEffect(() => {
    setEtiqueta('')
    setServidor('')
    setCredencial('')
  }, [alcance])

  const credenciales =
    (servidores.data?.results ?? []).find((fila) => fila.id === servidor)?.users ?? []

  const conceder = useMutation({
    mutationFn: () => {
      const [clave, valor] = etiqueta.split(':')
      return accessApi.grant({
        organization: slug,
        group: grupo.id,
        label_key: alcance === 'label' ? clave : undefined,
        label_value: alcance === 'label' ? valor : undefined,
        server: alcance === 'server' ? servidor : undefined,
        server_user: alcance === 'credential' ? credencial : undefined,
        level: nivel,
        expires_at: caduca || null,
      })
    },
    onSuccess: async () => {
      await accessApi.invalidarAcceso(cliente)
      setEtiqueta('')
      setServidor('')
      setCredencial('')
      setCaduca('')
      toast.success('Acceso dado al grupo.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const listo =
    alcance === 'organization' ||
    (alcance === 'label' && etiqueta !== '') ||
    (alcance === 'server' && servidor !== '') ||
    (alcance === 'credential' && credencial !== '')

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-2">
        <Label htmlFor="alcance-del-grupo">Dar acceso a</Label>
        <Select value={alcance} onValueChange={(valor) => setAlcance(valor as Alcance)}>
          <SelectTrigger id="alcance-del-grupo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <OpcionConIcono valor="organization" icono={ICONO_DEL_ALCANCE.organization}>
              Toda la organización
            </OpcionConIcono>
            <OpcionConIcono
              valor="label"
              icono={ICONO_DEL_ALCANCE.label}
              disabled={parejas.length === 0}
            >
              Una etiqueta
            </OpcionConIcono>
            <OpcionConIcono valor="server" icono={ICONO_DEL_ALCANCE.server}>
              Un servidor
            </OpcionConIcono>
            <OpcionConIcono valor="credential" icono={ICONO_DEL_ALCANCE.credential}>
              Una credencial
            </OpcionConIcono>
          </SelectContent>
        </Select>
      </div>

      {alcance === 'label' && (
        <div className="space-y-2">
          <Label htmlFor="etiqueta-del-grupo">Etiqueta</Label>
          <Select value={etiqueta} onValueChange={setEtiqueta}>
            <SelectTrigger id="etiqueta-del-grupo" className="w-full">
              <SelectValue placeholder="Elija una etiqueta" />
            </SelectTrigger>
            <SelectContent>
              {parejas.map((pareja) => (
                <OpcionConIcono
                  key={pareja}
                  valor={pareja}
                  icono={ICONO_DEL_ALCANCE.label}
                >
                  {describirEtiqueta(pareja)}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(alcance === 'server' || alcance === 'credential') && (
        <div className="space-y-2">
          <Label htmlFor="servidor-del-grupo">Servidor</Label>
          <Select value={servidor} onValueChange={setServidor}>
            <SelectTrigger id="servidor-del-grupo" className="w-full">
              <SelectValue placeholder="Elija un servidor" />
            </SelectTrigger>
            <SelectContent>
              {(servidores.data?.results ?? []).map((fila) => (
                <OpcionConIcono
                  key={fila.id}
                  valor={fila.id}
                  icono={ICONO_DEL_ALCANCE.server}
                >
                  {fila.name}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {alcance === 'credential' && servidor !== '' && (
        <div className="space-y-2">
          <Label htmlFor="credencial-del-grupo">Credencial</Label>
          <Select value={credencial} onValueChange={setCredencial}>
            <SelectTrigger id="credencial-del-grupo" className="w-full">
              <SelectValue placeholder="Elija una credencial" />
            </SelectTrigger>
            <SelectContent>
              {credenciales.map((fila) => (
                <OpcionConIcono
                  key={fila.id}
                  valor={fila.id}
                  icono={ICONO_DEL_ALCANCE.credential}
                >
                  {fila.username}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <div className="space-y-2">
          <Label htmlFor="nivel-del-grupo">Nivel</Label>
          <Select value={nivel} onValueChange={(valor) => setNivel(valor as AccessLevel)}>
            <SelectTrigger id="nivel-del-grupo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NIVELES_EN_ORDEN.map((clave) => (
                <OpcionConIcono key={clave} valor={clave} icono={NIVELES[clave].icono}>
                  {NIVELES[clave].etiqueta}
                </OpcionConIcono>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{NIVELES[nivel].alcance}</p>

      <ExpiryField id="caducidad-del-grupo" valor={caduca} onChange={setCaduca} />

      <Button
        className="w-full"
        disabled={!listo || conceder.isPending}
        onClick={() => conceder.mutate()}
      >
        <PlusIcon />
        Dar acceso
      </Button>
    </div>
  )
}
