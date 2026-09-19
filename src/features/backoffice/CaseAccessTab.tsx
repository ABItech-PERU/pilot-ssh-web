import { useQuery } from '@tanstack/react-query'
import { ServerOffIcon } from 'lucide-react'
import { useState } from 'react'

import { EmptyState, ErrorState } from '@/components/states'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DiagnosisResult } from '@/features/access/DiagnosisResult'
import * as platformApi from '@/features/backoffice/api'
import { useCaso } from '@/features/backoffice/caso'

/** «¿Por qué no puede entrar?»: la misma decisión que la terminal al
 *  conectar. De las credenciales, cuántas abren, no cuáles. */
export function CaseAccessTab() {
  const organizacion = useCaso()
  const [membresia, setMembresia] = useState('')
  const [servidor, setServidor] = useState('')

  const equipo = useQuery({
    queryKey: platformApi.clavesPlataforma.equipo(organizacion.slug, 1, 100, {}),
    queryFn: () => platformApi.fetchOrganizationMembers(organizacion.slug, 1, 100),
  })
  const servidores = useQuery({
    queryKey: platformApi.clavesPlataforma.servidores(organizacion.slug),
    queryFn: () => platformApi.fetchOrganizationServers(organizacion.slug),
  })
  const diagnostico = useQuery({
    queryKey: platformApi.clavesPlataforma.diagnostico(
      organizacion.slug,
      membresia,
      servidor,
    ),
    queryFn: () => platformApi.fetchDiagnosis(organizacion.slug, membresia, servidor),
    enabled: membresia !== '' && servidor !== '',
  })

  if (equipo.isError || servidores.isError) {
    return (
      <ErrorState
        error={equipo.error ?? servidores.error}
        onRetry={() => {
          void equipo.refetch()
          void servidores.refetch()
        }}
      />
    )
  }

  if (servidores.data?.count === 0) {
    return (
      <EmptyState
        enmarcado
        icon={ServerOffIcon}
        title="Sin servidores"
        description="Esta organización todavía no ha registrado ninguno."
      />
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-muted-foreground text-sm">
        Elija a la persona y el servidor que no abre. El resultado dice el motivo y cómo
        se resuelve.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="diagnostico-persona">Persona</Label>
          <Select value={membresia} onValueChange={setMembresia}>
            <SelectTrigger id="diagnostico-persona" className="w-full">
              <SelectValue
                placeholder={equipo.isPending ? 'Cargando…' : 'Elegir persona'}
              />
            </SelectTrigger>
            <SelectContent>
              {(equipo.data?.results ?? []).map((miembro) => (
                <SelectItem key={miembro.id} value={miembro.id}>
                  {miembro.user.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="diagnostico-servidor">Servidor</Label>
          <Select value={servidor} onValueChange={setServidor}>
            <SelectTrigger id="diagnostico-servidor" className="w-full">
              <SelectValue
                placeholder={servidores.isPending ? 'Cargando…' : 'Elegir servidor'}
              />
            </SelectTrigger>
            <SelectContent>
              {(servidores.data?.results ?? []).map((opcion) => (
                <SelectItem key={opcion.id} value={opcion.id}>
                  {opcion.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {membresia !== '' &&
        servidor !== '' &&
        (diagnostico.isPending ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : diagnostico.isError ? (
          <ErrorState error={diagnostico.error} onRetry={() => diagnostico.refetch()} />
        ) : (
          <DiagnosisResult veredicto={diagnostico.data}>
            {diagnostico.data.credentials_total > 0 && (
              <p className="text-muted-foreground px-4 py-2.5 text-sm">
                Puede conectar con {diagnostico.data.credentials_open} de{' '}
                {diagnostico.data.credentials_total}{' '}
                {diagnostico.data.credentials_total === 1 ? 'credencial' : 'credenciales'}
                .
              </p>
            )}
          </DiagnosisResult>
        ))}
    </div>
  )
}
