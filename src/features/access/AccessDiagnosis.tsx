import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import * as accessApi from '@/features/access/api'
import {
  colorDelVeredicto,
  DiagnosisResult,
  iconoDelVeredicto,
} from '@/features/access/DiagnosisResult'
import * as membersApi from '@/features/members/api'
import { toApiError } from '@/lib/api-error'
import type { Server } from '@/types/api'

/** «¿Por qué no puede entrar?»: motivo y solución por credencial. Misma
 *  decisión que toma la terminal al conectar. */
export function AccessDiagnosis({ server }: { server: Server }) {
  const [membresia, setMembresia] = useState('')

  const equipo = useQuery({
    queryKey: membersApi.clavesEquipo.miembros(server.organization_slug),
    queryFn: () => membersApi.fetchMembers(server.organization_slug),
  })

  const diagnostico = useQuery({
    queryKey: accessApi.clavesAcceso.diagnostico(server.id, membresia),
    queryFn: () => accessApi.fetchDiagnosis(server.id, membresia),
    enabled: membresia !== '',
  })

  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Comprobar acceso
        </h3>
        <p className="text-muted-foreground text-sm">
          Elija a alguien del equipo para saber si puede abrir una terminal aquí.
        </p>
      </div>

      <Select value={membresia} onValueChange={setMembresia}>
        <SelectTrigger className="w-full sm:max-w-sm" aria-label="Persona a comprobar">
          <SelectValue placeholder="Elegir persona" />
        </SelectTrigger>
        <SelectContent>
          {(equipo.data ?? []).map((miembro) => (
            <SelectItem key={miembro.id} value={miembro.id}>
              {miembro.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {membresia !== '' &&
        (diagnostico.isPending ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : diagnostico.isError ? (
          <p className="text-destructive text-sm">
            {toApiError(diagnostico.error).message}
          </p>
        ) : (
          <DiagnosisResult veredicto={diagnostico.data}>
            {diagnostico.data.credentials.length > 0 && (
              <ul className="divide-y">
                {diagnostico.data.credentials.map((credencial) => {
                  const Icono = iconoDelVeredicto(credencial.code)
                  return (
                    <li
                      key={credencial.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="font-machine min-w-0 truncate">
                        {credencial.username}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5',
                          colorDelVeredicto(credencial.code),
                        )}
                      >
                        <Icono className="size-3.5" />
                        {credencial.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </DiagnosisResult>
        ))}
    </section>
  )
}
