import { useQuery } from '@tanstack/react-query'
import {
  CircleCheckIcon,
  KeyRoundIcon,
  ShieldAlertIcon,
  TimerIcon,
  UsersIcon,
} from 'lucide-react'
import { useOutletContext } from 'react-router'

import { Bloque } from '@/components/bloque'
import { EmptyState, ErrorState, LineaEsqueleto } from '@/components/states'
import * as serversApi from '@/features/servers/api'
import {
  ActividadDiaria,
  ActividadDiariaEsqueleto,
  BarraDePeriodo,
  Cifra,
  Ranking,
  usePeriodoDeUso,
} from '@/features/servers/usage-parts'
import { formatSeconds } from '@/lib/format'
import type { Server } from '@/types/api'

/** Estado de uso: quién entra, con qué credencial, qué falla y qué llaves
 *  no usa nadie. El historial responde otra pregunta. */
export function ServerStatsTab() {
  const server = useOutletContext<Server>()
  const periodo = usePeriodoDeUso()

  const consulta = useQuery({
    queryKey: serversApi.clavesServidor.estadisticas(server.id, periodo.rango),
    queryFn: () => serversApi.fetchServerStats(server.id, periodo.rango),
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
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra
          icono={UsersIcon}
          etiqueta="Personas que entraron"
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
          icono={KeyRoundIcon}
          etiqueta="Sesiones con error"
          valor={datos ? String(datos.sessions.error) : undefined}
          pie="No llegaron a abrirse o se cayeron"
          alerta={Boolean(datos && datos.sessions.error > 0)}
        />
        <Cifra
          icono={ShieldAlertIcon}
          etiqueta="Intentos denegados"
          valor={datos ? String(datos.denied) : undefined}
          pie="Quisieron entrar y no pudieron"
          alerta={Boolean(datos && datos.denied > 0)}
        />
      </dl>

      <Bloque titulo="Actividad del periodo">
        <div className="p-4">
          {datos ? <ActividadDiaria datos={datos} /> : <ActividadDiariaEsqueleto />}
        </div>
      </Bloque>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque titulo="Quién entra más">
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
                description="Nadie ha entrado en ese tiempo."
              />
            }
          />
        </Bloque>

        <Bloque titulo="Con qué credencial">
          <Ranking
            filas={datos?.top_credentials.map((fila) => ({
              nombre: fila.username,
              total: fila.sessions,
              maquina: true,
            }))}
            vacio={
              <EmptyState
                compacto
                icon={KeyRoundIcon}
                title="Sin uso en el periodo"
                description="Ninguna credencial se ha usado en ese tiempo."
              />
            }
          />
        </Bloque>
      </div>

      <Bloque titulo="Credenciales que no usa nadie">
        {datos === undefined ? (
          <div className="px-4 py-3">
            <LineaEsqueleto className="w-40" />
          </div>
        ) : datos.unused_credentials.length === 0 ? (
          <EmptyState
            compacto
            icon={CircleCheckIcon}
            title="Todas en uso"
            description="Cada credencial se ha usado alguna vez."
          />
        ) : (
          <ul className="divide-y">
            {datos.unused_credentials.map((username) => (
              <li key={username} className="px-4 py-3">
                <span className="font-machine text-sm">{username}</span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  )
}
