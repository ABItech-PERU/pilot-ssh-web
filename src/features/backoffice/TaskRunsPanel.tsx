import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Pagination } from '@/components/pagination'
import { SidePanelBody, SidePanelContent, SidePanelHeader } from '@/components/side-panel'
import { ErrorState } from '@/components/states'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import * as platformApi from '@/features/backoffice/api'
import {
  ESTADO_DE_LA_CORRIDA,
  formatearDuracion,
  SALUD_DE_LA_TAREA,
} from '@/features/backoffice/operaciones'
import { EstadoBadge } from '@/features/credits/partes'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { ScheduledTask } from '@/types/api'

const POR_PAGINA = 20

interface Props {
  tarea: ScheduledTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Corridas de una tarea, de la última hacia atrás. */
export function TaskRunsPanel({ tarea, open, onOpenChange }: Props) {
  const [pagina, setPagina] = useState(1)

  const corridas = useQuery({
    queryKey: platformApi.clavesPlataforma.corridas(tarea?.task ?? '', pagina),
    queryFn: () => platformApi.fetchTaskRuns(tarea!.task, pagina, POR_PAGINA),
    enabled: open && tarea !== null,
    placeholderData: (anterior) => anterior,
  })
  const salud = tarea && SALUD_DE_LA_TAREA[tarea.health]

  return (
    <Sheet
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) setPagina(1)
        onOpenChange(abierto)
      }}
    >
      <SidePanelContent>
        <SidePanelHeader>
          <SheetTitle className="text-lg">{tarea?.name ?? 'Tarea'}</SheetTitle>
          <SheetDescription>{tarea?.frequency}</SheetDescription>
        </SidePanelHeader>

        {tarea && salud && (
          <SidePanelBody>
            <div className="space-y-2 border-b px-5 py-4">
              <EstadoBadge tono={salud.tono} etiqueta={salud.etiqueta} />
              <p className="text-muted-foreground text-sm">{salud.explicacion}</p>
            </div>

            <section className="px-5 py-4">
              <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.12em] uppercase">
                Corridas
              </h3>

              {corridas.isError && (
                <ErrorState error={corridas.error} onRetry={() => corridas.refetch()} />
              )}
              {corridas.isPending && (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              )}
              {corridas.data?.count === 0 && (
                <p className="text-muted-foreground text-sm">Todavía no ha corrido.</p>
              )}

              <ol className="space-y-2">
                {corridas.data?.results.map((corrida) => {
                  const estado = ESTADO_DE_LA_CORRIDA[corrida.status]
                  return (
                    <li key={corrida.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {formatDateTime(corrida.created_at)}
                        </span>
                        <EstadoBadge tono={estado.tono} etiqueta={estado.etiqueta} />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatRelative(corrida.created_at)} · duró{' '}
                        {formatearDuracion(corrida.duration_seconds)}
                      </p>
                      {corrida.description && (
                        <p
                          className={
                            corrida.status === 'failed'
                              ? 'text-destructive mt-1.5 text-sm break-words'
                              : 'mt-1.5 text-sm break-words'
                          }
                        >
                          {corrida.description}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>

              {(corridas.data?.count ?? 0) > POR_PAGINA && (
                <div className="mt-4">
                  <Pagination
                    pagina={pagina}
                    total={corridas.data?.count ?? 0}
                    porPagina={POR_PAGINA}
                    etiqueta="corridas"
                    onCambiar={setPagina}
                  />
                </div>
              )}
            </section>
          </SidePanelBody>
        )}
      </SidePanelContent>
    </Sheet>
  )
}
