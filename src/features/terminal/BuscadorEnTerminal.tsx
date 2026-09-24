import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

export interface Coincidencias {
  actual: number
  total: number
}

interface BuscadorProps {
  coincidencias: Coincidencias
  onBuscar: (texto: string, haciaAtras: boolean) => void
  onCerrar: () => void
}

/** Barra de búsqueda sobre el historial de la shell. */
export function BuscadorEnTerminal({ coincidencias, onBuscar, onCerrar }: BuscadorProps) {
  const [texto, setTexto] = useState('')
  const entrada = useRef<HTMLInputElement | null>(null)

  // Tras pasar de una coincidencia a otra se sigue escribiendo aqui
  const pasar = (haciaAtras: boolean) => {
    onBuscar(texto, haciaAtras)
    entrada.current?.focus()
  }

  return (
    <form
      role="search"
      className="border-term-border bg-term-bg absolute top-3 right-4 flex items-center gap-1 rounded-md border px-2 py-1"
      onSubmit={(evento) => {
        evento.preventDefault()
        onBuscar(texto, false)
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') onCerrar()
      }}
    >
      <SearchIcon className="text-term-dim size-3.5 shrink-0" />
      <input
        autoFocus
        ref={entrada}
        value={texto}
        aria-label="Buscar en la terminal"
        placeholder="Buscar"
        className="placeholder:text-term-dim w-40 bg-transparent py-0.5 text-xs outline-none"
        onChange={(evento) => {
          setTexto(evento.target.value)
          onBuscar(evento.target.value, false)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' && evento.shiftKey) {
            evento.preventDefault()
            onBuscar(texto, true)
          }
        }}
      />
      <span className="text-term-dim w-14 text-right text-[11px] tabular-nums">
        {texto &&
          (coincidencias.total
            ? `${coincidencias.actual}/${coincidencias.total}`
            : 'nada')}
      </span>
      <Paso etiqueta="Anterior" onClick={() => pasar(true)}>
        <ChevronUpIcon className="size-3.5" />
      </Paso>
      <Paso etiqueta="Siguiente" onClick={() => pasar(false)}>
        <ChevronDownIcon className="size-3.5" />
      </Paso>
      <Paso etiqueta="Cerrar la búsqueda" onClick={onCerrar}>
        <XIcon className="size-3.5" />
      </Paso>
    </form>
  )
}

function Paso({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={etiqueta}
      onClick={onClick}
      className="text-term-dim hover:text-term-text size-6 hover:bg-white/5"
    >
      {children}
    </Button>
  )
}
