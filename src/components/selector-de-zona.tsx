import { cn } from 'cn'
import { CheckIcon, SearchIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  describirZona,
  ordenarPorDesfase,
  zonasDisponibles,
  type Zona,
} from '@/lib/zona-horaria'

interface Props {
  elegida: string
  onElegir: (nombre: string) => void
  /** Las que casi siempre se vienen a poner: van arriba, con su motivo. */
  sugeridas: { nombre: string; motivo: string }[]
  /** La que se centra en la lista al abrir. */
  centrada: string
}

/** Unas cuatrocientas zonas, por ciudad, país o desfase; abre con la actual
 *  a la vista. Montar solo con el diálogo abierto: describirlas cuesta. */
export function SelectorDeZona({ elegida, onElegir, sugeridas, centrada }: Props) {
  const [buscado, setBuscado] = useState('')
  const zonas = useMemo(() => ordenarPorDesfase(zonasDisponibles()), [])

  // Centra la fila al montarla. Va en un ref y no en un efecto: el diálogo
  // pinta su contenido un render después de abrirse
  const centrarEnLaLista = useCallback((fila: HTMLButtonElement | null) => {
    const lista = fila?.parentElement
    if (!fila || !lista) return
    lista.scrollTop = fila.offsetTop - (lista.clientHeight - fila.clientHeight) / 2
  }, [])

  const texto = normalizar(buscado.trim())
  // Por ciudad, país o desfase: «perú» y «utc-05» encuentran Lima sin saber
  // cómo se escribe en inglés
  const visibles = texto
    ? zonas.filter((zona) =>
        normalizar(
          `${zona.ciudad} ${zona.region} ${zona.nombre} ${zona.desfase}`,
        ).includes(texto),
      )
    : zonas

  return (
    <div className="min-w-0 space-y-4">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label="Buscar zona horaria"
          value={buscado}
          placeholder="Ciudad, país o desfase"
          autoComplete="off"
          autoFocus
          className="pl-9"
          onChange={(evento) => setBuscado(evento.target.value)}
        />
      </div>

      {!texto && sugeridas.length > 0 && (
        <div className="space-y-1.5">
          <p className={ROTULO}>Sugeridas</p>
          <div
            role="listbox"
            aria-label="Zonas sugeridas"
            className="divide-y overflow-hidden rounded-lg border"
          >
            {sugeridas.map(({ nombre, motivo }) => (
              <OpcionDeZona
                key={nombre}
                zona={describirZona(nombre)}
                motivo={motivo}
                elegida={nombre === elegida}
                onElegir={onElegir}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className={ROTULO}>{texto ? 'Resultados' : 'Todas las zonas'}</p>
        <div
          role="listbox"
          aria-label="Zonas horarias"
          className="relative max-h-56 divide-y overflow-y-auto rounded-lg border"
        >
          {visibles.map((zona) => (
            <OpcionDeZona
              key={zona.nombre}
              ref={zona.nombre === centrada ? centrarEnLaLista : undefined}
              zona={zona}
              elegida={zona.nombre === elegida}
              onElegir={onElegir}
            />
          ))}
          {visibles.length === 0 && (
            <p className="text-muted-foreground p-3 text-sm">
              Ninguna coincide. Pruebe con el país o el desfase: «Perú», «UTC-05».
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const ROTULO = 'text-muted-foreground text-xs font-semibold tracking-wide uppercase'

/** Ciudad y región a la izquierda, la hora y el desfase a la derecha: se
 *  reconoce por el nombre y se confirma por la hora. */
function OpcionDeZona({
  ref,
  zona,
  motivo,
  elegida,
  onElegir,
}: {
  ref?: React.Ref<HTMLButtonElement>
  zona: Zona
  motivo?: string
  elegida: boolean
  onElegir: (nombre: string) => void
}) {
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={elegida}
      onClick={() => onElegir(zona.nombre)}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        elegida ? 'bg-primary/10' : 'hover:bg-muted/60',
      )}
    >
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-full border',
          elegida ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
        aria-hidden
      >
        {elegida && <CheckIcon className="size-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{zona.ciudad}</span>
          {motivo && (
            <Badge variant="secondary" className="font-normal">
              {motivo}
            </Badge>
          )}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {[zona.region, zona.nombre].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm tabular-nums">{zona.hora}</span>
        <span className="font-machine text-muted-foreground block text-xs">
          {zona.desfase}
        </span>
      </span>
    </button>
  )
}

/** «Perú» encuentra «Peru» y «Bogotá» encuentra «Bogota»: sin tildes y en
 *  minúscula, a los dos lados. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
