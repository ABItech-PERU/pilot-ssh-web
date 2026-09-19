import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ChoiceCard } from '@/components/choice-card'
import { FieldError } from '@/components/field-error'
import { FormDialogContent } from '@/components/form-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as accessApi from '@/features/access/api'
import {
  concederAccesosDirectos,
  DirectGrantsField,
  type AccesoDirecto,
} from '@/features/access/DirectGrantsField'
import { NIVELES, NIVELES_EN_ORDEN } from '@/features/access/levels'
import { OpcionConIcono } from '@/features/access/OpcionConIcono'
import { describirLoQueAlcanza } from '@/features/access/subject'
import * as membersApi from '@/features/members/api'
import { ROLES, ROLES_QUE_SE_ASIGNAN } from '@/features/members/roles'
import { toApiError } from '@/lib/api-error'
import type { AccessGroup, AccessLevel, OrganizationRole } from '@/types/api'

interface Props {
  slug: string
  /** Para invitar a alguien concreto, p. ej. con acceso y fuera del equipo. */
  correoInicial?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Dos preguntas separadas: qué gestiona (el rol) y a qué entra (toda la
 *  organización, sus grupos o algo concreto). */
export function InviteDialog({ slug, correoInicial, open, onOpenChange }: Props) {
  const cliente = useQueryClient()
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState<OrganizationRole>('member')
  const [eleccion, setEleccion] = useState<string[] | null>(null)
  const [directos, setDirectos] = useState<AccesoDirecto[]>([])
  // Por defecto «Solo lo que elija», vacío: lo mínimo
  const [modo, setModo] = useState<'concreto' | 'todo'>('concreto')
  const [nivelDeTodo, setNivelDeTodo] = useState<AccessLevel>('connect')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCorreo(correoInicial ?? '')
      setRol('member')
      setEleccion(null)
      setDirectos([])
      setModo('concreto')
      setNivelDeTodo('connect')
      setAviso(null)
    }
  }, [open, correoInicial])

  const catalogo = useQuery({
    queryKey: accessApi.clavesAcceso.grupos(slug),
    queryFn: () => accessApi.fetchGroups(slug),
    enabled: open,
  })

  // Misma clave que la pestaña de grupos; dice qué grupo alcanza la
  // organización entera
  const concesiones = useQuery({
    queryKey: accessApi.clavesAcceso.concesiones(slug),
    queryFn: () => accessApi.fetchGrants(slug),
    enabled: open,
  })

  const grupos = catalogo.data ?? []
  const elegidos = eleccion ?? []
  const todo = modo === 'todo'
  // Quien administra entra a todo por su rol: elegir alcance no aplica
  const porSuRol = rol === 'admin'

  const invitar = useMutation({
    mutationFn: async () => {
      const invitacion = await membersApi.invite(slug, {
        email: correo.trim(),
        role: rol,
      })
      // La lista viaja siempre, aun vacía. Con toda la organización o rol
      // admin no viaja lo concreto marcado antes: manda lo visible
      await accessApi.setInvitationGroups(invitacion.id, porSuRol || todo ? [] : elegidos)
      // Tras crearla: el backend asocia lo concreto a la invitación viva por
      // su correo hasta que acepte
      const fallidos = await concederAccesosDirectos(
        slug,
        invitacion.email,
        porSuRol || todo ? [] : directos,
        !porSuRol && todo ? nivelDeTodo : null,
      )
      return { invitacion, fallidos }
    },
    onSuccess: async ({ invitacion, fallidos }) => {
      await cliente.invalidateQueries({ queryKey: ['invitations'] })
      await accessApi.invalidarAcceso(cliente)
      onOpenChange(false)

      if (fallidos.length > 0) {
        toast.error(
          `Invitación enviada a ${invitacion.email}, pero falta ${fallidos.join(' y ')}. Delo desde «Compartir».`,
        )
      } else {
        toast.success(`Invitación enviada a ${invitacion.email}.`)
      }
    },
    onError: (error) => {
      const fallo = toApiError(error)
      setAviso(fallo.fieldErrors.email?.[0] ?? fallo.message)
    },
  })

  // Un grupo con toda la organización deja sin efecto lo concreto de igual
  // o menor nivel
  const todoDelGrupo = (grupo: string) =>
    (concesiones.data ?? []).find(
      (concesion) => concesion.group === grupo && concesion.scope === 'organization',
    )
  const grupoQueCubre = grupos.find(
    (grupo) => elegidos.includes(grupo.id) && todoDelGrupo(grupo.id),
  )
  const cobertura = grupoQueCubre
    ? {
        id: grupoQueCubre.id,
        nombre: grupoQueCubre.name,
        nivel: todoDelGrupo(grupoQueCubre.id)?.level ?? 'connect',
      }
    : null

  const alternar = (grupo: AccessGroup) =>
    setEleccion(
      elegidos.includes(grupo.id)
        ? elegidos.filter((fila) => fila !== grupo.id)
        : [...elegidos, grupo.id],
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar al equipo</DialogTitle>
          <DialogDescription>
            Le llegará un correo con el enlace para unirse.
          </DialogDescription>
        </DialogHeader>

        {aviso && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{aviso}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="correo-invitado">Correo</Label>
          <Input
            id="correo-invitado"
            type="email"
            autoComplete="off"
            autoFocus
            placeholder="nombre@correo.com"
            value={correo}
            aria-invalid={Boolean(aviso)}
            onChange={(evento) => {
              setCorreo(evento.target.value)
              setAviso(null)
            }}
          />
          <FieldError message={aviso ?? undefined} />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Qué podrá gestionar</legend>
          <div className="grid gap-2" role="radiogroup">
            {ROLES_QUE_SE_ASIGNAN.map((clave) => (
              <ChoiceCard
                key={clave}
                tipo="radio"
                elegida={rol === clave}
                titulo={ROLES[clave].etiqueta}
                ayuda={ROLES[clave].alcance}
                onClick={() => setRol(clave)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">A qué entrará</legend>
          {porSuRol ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <ShieldCheckIcon className="size-4 shrink-0" />
              Entrará a todo por su rol.
            </p>
          ) : (
            <>
              {/* Mismo peso para ambas: no empujar a dar todo */}
              <div className="grid gap-2">
                <ChoiceCard
                  tipo="radio"
                  elegida={!todo}
                  titulo="Solo lo que elija"
                  ayuda="Sus grupos, o servidores y credenciales concretos."
                  onClick={() => setModo('concreto')}
                />
                {!todo && (
                  <div className="grid gap-2 pl-4">
                    {grupos.map((grupo) => {
                      const cubierto = cobertura !== null && cobertura.id !== grupo.id
                      return (
                        <ChoiceCard
                          key={grupo.id}
                          tipo="casilla"
                          elegida={elegidos.includes(grupo.id)}
                          apagada={cubierto}
                          titulo={grupo.name}
                          pie={
                            cubierto
                              ? `Ya lo cubre ${cobertura?.nombre}`
                              : describirLoQueAlcanza(grupo.id, concesiones.data ?? [])
                          }
                          onClick={() => alternar(grupo)}
                        />
                      )
                    })}
                    <DirectGrantsField
                      organizacion={slug}
                      valor={directos}
                      onChange={setDirectos}
                      cobertura={cobertura}
                    />
                  </div>
                )}
                <ChoiceCard
                  tipo="radio"
                  elegida={todo}
                  titulo="Toda la organización"
                  ayuda="Todos los servidores, también los que se añadan."
                  onClick={() => setModo('todo')}
                />
                {todo && <NivelDeTodo valor={nivelDeTodo} onChange={setNivelDeTodo} />}
              </div>
            </>
          )}
        </fieldset>

        <DialogFooter>
          <Button
            disabled={correo.trim().length === 0 || invitar.isPending}
            onClick={() => invitar.mutate()}
          >
            {invitar.isPending && <Loader2Icon className="animate-spin" />}
            Enviar invitación
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

/** Nivel para toda la organización, aparte de la opción: casi siempre
 *  Conectar. */
function NivelDeTodo({
  valor,
  onChange,
}: {
  valor: AccessLevel
  onChange: (nivel: AccessLevel) => void
}) {
  return (
    <div className="flex items-center gap-2 pl-4">
      <Label
        htmlFor="nivel-de-todo"
        className="text-muted-foreground text-xs font-normal"
      >
        Con nivel
      </Label>
      <Select value={valor} onValueChange={(nuevo) => onChange(nuevo as AccessLevel)}>
        <SelectTrigger id="nivel-de-todo" size="sm" className="w-40">
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
  )
}
