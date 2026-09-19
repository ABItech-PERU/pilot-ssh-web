import { useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon, CalendarClockIcon, HistoryIcon } from 'lucide-react'
import { useState } from 'react'

import { DataTable, type Columna } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import * as platformApi from '@/features/backoffice/api'
import { formatearDuracion, SALUD_DE_LA_TAREA } from '@/features/backoffice/operaciones'
import { TaskRunsPanel } from '@/features/backoffice/TaskRunsPanel'
import { EstadoBadge, FechaCelda } from '@/features/credits/partes'
import { formatRelative } from '@/lib/format'
import type { ScheduledTask } from '@/types/api'

/** Se refresca sola: una tarea se atrasa sin que nadie toque nada. */
const MS_REFRESCO = 60_000

/** Tareas de beat. Una atrasada delata a beat o al worker caído: nada
 *  falla, solo deja de pasar. */
export function ScheduledTasksTab() {
  const [historial, setHistorial] = useState<ScheduledTask | null>(null)

  const tareas = useQuery({
    queryKey: platformApi.clavesPlataforma.tareas(),
    queryFn: platformApi.fetchScheduledTasks,
    refetchInterval: MS_REFRESCO,
  })
  const atrasadas = (tareas.data ?? []).filter((tarea) => tarea.health === 'late')

  const columnas: Columna<ScheduledTask>[] = [
    {
      key: 'name',
      header: 'Tarea',
      rol: 'titulo',
      fija: true,
      ancho: '24%',
      lineas: 2,
      cell: (tarea) => (
        <span className="block min-w-0">
          <span className="block truncate text-sm font-medium">{tarea.name}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {tarea.frequency}
          </span>
        </span>
      ),
    },
    {
      key: 'health',
      header: 'Estado',
      prioridad: 1,
      ancho: '13%',
      cell: (tarea) => {
        const salud = SALUD_DE_LA_TAREA[tarea.health]
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <EstadoBadge tono={salud.tono} etiqueta={salud.etiqueta} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{salud.explicacion}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      key: 'last_run',
      header: 'Última corrida',
      prioridad: 2,
      ancho: '16%',
      lineas: 2,
      cell: (tarea) =>
        tarea.last_run ? (
          <FechaCelda iso={tarea.last_run.created_at} />
        ) : (
          <span className="text-muted-foreground text-sm">Nunca</span>
        ),
    },
    {
      key: 'description',
      header: 'Qué hizo',
      prioridad: 3,
      desde: 'md',
      ancho: '29%',
      lineas: 2,
      cell: (tarea) =>
        tarea.last_run?.description ? (
          <span
            className={
              tarea.last_run.status === 'failed'
                ? 'text-destructive line-clamp-2 text-sm whitespace-normal'
                : 'line-clamp-2 text-sm whitespace-normal'
            }
          >
            {tarea.last_run.description}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: 'duration',
      header: 'Duró',
      prioridad: 5,
      desde: 'lg',
      ancho: '8%',
      cell: (tarea) => (
        <span className="text-sm tabular-nums">
          {formatearDuracion(tarea.last_run?.duration_seconds ?? null)}
        </span>
      ),
    },
    {
      key: 'next_run_at',
      header: 'Próxima',
      prioridad: 4,
      desde: 'lg',
      ancho: '10%',
      cell: (tarea) => (
        <span className="text-sm">
          {tarea.health === 'late' ? '—' : formatRelative(tarea.next_run_at)}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      rol: 'acciones',
      fija: true,
      acciones: 1,
      alineacion: 'centro',
      ancho: '5.5rem',
      cell: (tarea) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ver las corridas de ${tarea.name}`}
              onClick={() => setHistorial(tarea)}
            >
              <HistoryIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ver corridas</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {atrasadas.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>
            {atrasadas.length === 1
              ? 'Una tarea no corrió a su hora'
              : `${atrasadas.length} tareas no corrieron a su hora`}
          </AlertTitle>
          <AlertDescription>
            El planificador o el worker no están corriendo: no se cobra, no se reintentan
            los pagos y no salen los correos. Avise a quien administra el servidor.
          </AlertDescription>
        </Alert>
      )}

      <DataTable
        columnas={columnas}
        datos={tareas.data ?? []}
        getKey={(tarea) => tarea.task}
        vista="tabla"
        cargando={tareas.isPending}
        error={tareas.error}
        onReintentar={() => tareas.refetch()}
        filasEsperadas={4}
        vacio={
          <EmptyState
            icon={CalendarClockIcon}
            title="Sin tareas programadas"
            description="No hay ninguna tarea en el calendario de beat."
          />
        }
      />

      <TaskRunsPanel
        tarea={historial}
        open={historial !== null}
        onOpenChange={(abierto) => !abierto && setHistorial(null)}
      />
    </div>
  )
}
