import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, NotebookPenIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FieldError } from '@/components/field-error'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import * as platformApi from '@/features/backoffice/api'
import { useCaso } from '@/features/backoffice/caso'
import { toApiError } from '@/lib/api-error'
import { formatDateTime, formatRelative } from '@/lib/format'

const POR_PAGINA = 10

/** Traspaso entre quienes atienden. El cliente no las ve y no se editan:
 *  son el rastro del caso. */
export function CaseNotesTab() {
  const organizacion = useCaso()
  const cliente = useQueryClient()
  const [pagina, setPagina] = useState(1)
  const [nota, setNota] = useState('')

  const notas = useQuery({
    queryKey: platformApi.clavesPlataforma.notas(organizacion.slug, pagina),
    queryFn: () => platformApi.fetchNotes(organizacion.slug, pagina),
    placeholderData: (anterior) => anterior,
  })

  const anotar = useMutation({
    mutationFn: () => platformApi.addNote(organizacion.slug, nota.trim()),
    onSuccess: async () => {
      setNota('')
      setPagina(1)
      await cliente.invalidateQueries({
        queryKey: ['platform', 'organizations', 'detalle', organizacion.slug, 'notes'],
      })
      toast.success('Nota añadida.')
    },
  })

  const error = anotar.error ? toApiError(anotar.error) : null

  return (
    <div className="max-w-3xl space-y-6">
      <form
        className="space-y-2"
        onSubmit={(evento) => {
          evento.preventDefault()
          anotar.mutate()
        }}
      >
        <Label htmlFor="nota-del-caso">Nueva nota</Label>
        <Textarea
          id="nota-del-caso"
          rows={3}
          maxLength={2000}
          value={nota}
          aria-invalid={Boolean(error)}
          aria-describedby="pista-de-la-nota"
          onChange={(evento) => {
            setNota(evento.target.value)
            anotar.reset()
          }}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          {error ? (
            <FieldError message={error.fieldErrors.body?.[0] ?? error.message} />
          ) : (
            <p id="pista-de-la-nota" className="text-muted-foreground text-xs">
              Solo la ve el personal. No se puede editar después.
            </p>
          )}
          <Button type="submit" disabled={nota.trim() === '' || anotar.isPending}>
            {anotar.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <NotebookPenIcon />
            )}
            Añadir nota
          </Button>
        </div>
      </form>

      {notas.isPending ? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : notas.isError ? (
        <ErrorState error={notas.error} onRetry={() => notas.refetch()} />
      ) : notas.data.count === 0 ? (
        <EmptyState
          icon={NotebookPenIcon}
          title="Sin notas"
          description="Anote lo que pasó con este cliente para quien lo atienda después."
        />
      ) : (
        <>
          <ol className="divide-y rounded-lg border">
            {notas.data.results.map((entrada) => (
              <li key={entrada.id} className="space-y-1.5 p-4">
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="text-foreground font-medium">
                    {entrada.author || 'Una cuenta que ya no existe'}
                  </span>
                  <span aria-hidden>·</span>
                  <time
                    dateTime={entrada.created_at}
                    title={formatDateTime(entrada.created_at)}
                  >
                    {formatRelative(entrada.created_at)}
                  </time>
                </p>
                <p className="text-sm break-words whitespace-pre-wrap">{entrada.body}</p>
              </li>
            ))}
          </ol>
          <Pagination
            pagina={pagina}
            total={notas.data.count}
            porPagina={POR_PAGINA}
            etiqueta="notas"
            onCambiar={setPagina}
          />
        </>
      )}
    </div>
  )
}
