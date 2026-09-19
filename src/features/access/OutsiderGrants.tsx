import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlusIcon, UserXIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SettingsSection } from '@/components/settings-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as accessApi from '@/features/access/api'
import { NIVELES } from '@/features/access/levels'
import { describirAlcance } from '@/features/access/scope'
import * as membersApi from '@/features/members/api'
import { InviteDialog } from '@/features/members/InviteDialog'
import { toApiError } from '@/lib/api-error'
import type { AccessGrant } from '@/types/api'

interface Suelto {
  email: string
  nombre: string
  concesiones: AccessGrant[]
}

/** Accesos de quien no está en el equipo: sin membresía no elige la
 *  organización y nunca los ve. Se invita o se quitan. */
export function OutsiderGrants({ slug }: { slug: string }) {
  const cliente = useQueryClient()
  const [aInvitar, setAInvitar] = useState<Suelto | null>(null)
  const [aQuitar, setAQuitar] = useState<Suelto | null>(null)

  const concesiones = useQuery({
    queryKey: accessApi.clavesAcceso.concesiones(slug),
    queryFn: () => accessApi.fetchGrants(slug),
  })

  const equipo = useQuery({
    queryKey: membersApi.clavesEquipo.miembros(slug),
    queryFn: () => membersApi.fetchMembers(slug),
  })

  const quitar = useMutation({
    mutationFn: (suelto: Suelto) =>
      Promise.all(suelto.concesiones.map((concesion) => accessApi.revoke(concesion.id))),
    onSuccess: async () => {
      await accessApi.invalidarAcceso(cliente)
      setAQuitar(null)
      toast.success('Acceso quitado.')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  if (!concesiones.data || !equipo.data) return null

  const sueltos = agruparPorPersona(concesiones.data, equipo.data)
  if (sueltos.length === 0) return null

  return (
    <>
      <SettingsSection
        titulo="Con acceso, pero fuera del equipo"
        descripcion="No pueden entrar: sin estar en el equipo no ven esta organización."
        accion={
          <span className="text-muted-foreground text-xs tabular-nums">
            {sueltos.length}
          </span>
        }
      >
        {sueltos.map((suelto) => (
          <div
            key={suelto.email}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <span className="flex min-w-0 items-center gap-3">
              <UserXIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {suelto.nombre}
                </span>
                <span className="text-muted-foreground font-machine block truncate text-xs">
                  {suelto.email}
                </span>
              </span>
            </span>

            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {contarAccesos(suelto.concesiones.length)}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setAInvitar(suelto)}>
                <UserPlusIcon />
                Invitar al equipo
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar el acceso de ${suelto.nombre}`}
                onClick={() => setAQuitar(suelto)}
              >
                <XIcon />
              </Button>
            </span>
          </div>
        ))}
      </SettingsSection>

      <InviteDialog
        slug={slug}
        correoInicial={aInvitar?.email}
        open={aInvitar !== null}
        onOpenChange={(abierto) => !abierto && setAInvitar(null)}
      />

      <ConfirmDialog
        open={aQuitar !== null}
        onOpenChange={(abierto) => !abierto && setAQuitar(null)}
        titulo={`¿Quitar el acceso de ${aQuitar?.nombre ?? ''}?`}
        descripcion="Deja de figurar en esta organización. Puede volver a dárselo cuando entre al equipo."
        detalles={aQuitar ? describirLoQueSeQuita(aQuitar.concesiones) : []}
        accion="Quitar el acceso"
        destructiva
        pendiente={quitar.isPending}
        onConfirmar={() => aQuitar && quitar.mutate(aQuitar)}
      />
    </>
  )
}

/** Una fila por persona, no por concesión. */
function agruparPorPersona(
  concesiones: AccessGrant[],
  equipo: { email: string }[],
): Suelto[] {
  const dentro = new Set(equipo.map((miembro) => miembro.email))
  const porCorreo = new Map<string, Suelto>()

  for (const concesion of concesiones) {
    const correo = concesion.subject_email
    if (concesion.subject_type !== 'user' || !correo || dentro.has(correo)) continue

    const suelto = porCorreo.get(correo) ?? {
      email: correo,
      nombre: concesion.subject_name,
      concesiones: [],
    }
    suelto.concesiones.push(concesion)
    porCorreo.set(correo, suelto)
  }

  return [...porCorreo.values()]
}

function describirLoQueSeQuita(concesiones: AccessGrant[]): string[] {
  return concesiones.map(
    (concesion) =>
      `${NIVELES[concesion.level].etiqueta} en ${describirAlcance(concesion)}`,
  )
}

function contarAccesos(cuantos: number) {
  return cuantos === 1 ? '1 acceso' : `${cuantos} accesos`
}
