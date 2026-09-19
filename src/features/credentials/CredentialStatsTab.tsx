import { useQuery } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  GlobeIcon,
  HourglassIcon,
  TimerIcon,
  UsersIcon,
} from 'lucide-react'
import { useOutletContext } from 'react-router'

import { Bloque } from '@/components/bloque'
import { EmptyState, ErrorState } from '@/components/states'
import * as credentialsApi from '@/features/credentials/api'
import {
  ActividadDiaria,
  ActividadDiariaEsqueleto,
  BarraDePeriodo,
  Cifra,
  Ranking,
  usePeriodoDeUso,
} from '@/features/servers/usage-parts'
import { formatSeconds } from '@/lib/format'
import type { ServerUser } from '@/types/api'

/** «Desde dónde» es la clave: delata una IP ajena con un usuario de
 *  producción. */
export function CredentialStatsTab() {
  const credencial = useOutletContext<ServerUser>()
  const periodo = usePeriodoDeUso()

  const consulta = useQuery({
    queryKey: credentialsApi.clavesCredencial.estadisticas(credencial.id, periodo.rango),
    queryFn: () => credentialsApi.fetchStats(credencial.id, periodo.rango),
  })

  if (consulta.isError) {
    return <ErrorState error={consulta.error} onRetry={() => consulta.refetch()} />
  }

  const datos = consulta.data

  return (
    <div className="space-y-6">
      <BarraDePeriodo
        estado={periodo}
        cargando={consulta.isFetching}
        onActualizar={() => consulta.refetch()}
      />

      <dl className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Cifra
          icono={UsersIcon}
          etiqueta="Personas que la usaron"
          valor={datos ? String(datos.people) : undefined}
          pie={`${datos?.sessions.total ?? 0} sesiones en el periodo`}
        />
        <Cifra
          icono={TimerIcon}
          etiqueta="Tiempo conectado"
          valor={datos ? formatSeconds(datos.connected_seconds) : undefined}
          pie="Suma de las sesiones cerradas"
        />
        <Cifra
          icono={HourglassIcon}
          etiqueta="Duración media"
          valor={datos ? formatSeconds(datos.average_seconds) : undefined}
          pie="Por sesión cerrada"
        />
        <Cifra
          icono={CircleAlertIcon}
          etiqueta="Sesiones con error"
          valor={datos ? String(datos.sessions.error) : undefined}
          pie="No llegaron a abrirse o se cayeron"
          alerta={Boolean(datos && datos.sessions.error > 0)}
        />
      </dl>

      <Bloque titulo="Actividad del periodo">
        <div className="p-4">
          {datos ? <ActividadDiaria datos={datos} /> : <ActividadDiariaEsqueleto />}
        </div>
      </Bloque>

      <div className="grid gap-6 xl:grid-cols-2">
        <Bloque titulo="Quién la usa más">
          <Ranking
            filas={datos?.top_people.map((fila) => ({
              nombre: fila.name,
              total: fila.sessions,
            }))}
            vacio={
              <EmptyState
                compacto
                icon={UsersIcon}
                title="Sin uso en el periodo"
                description="Nadie la ha usado en ese tiempo."
              />
            }
          />
        </Bloque>

        <Bloque titulo="Desde dónde se conecta">
          <Ranking
            filas={datos?.top_addresses.map((fila) => ({
              nombre: fila.ip,
              total: fila.sessions,
              maquina: true,
            }))}
            vacio={
              <EmptyState
                compacto
                icon={GlobeIcon}
                title="Sin conexiones"
                description="Ninguna conexión en ese tiempo."
              />
            }
          />
        </Bloque>
      </div>
    </div>
  )
}
