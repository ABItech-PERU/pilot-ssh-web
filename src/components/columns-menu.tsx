import { Columns3Icon, RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MAXIMO_DE_COLUMNAS, type MetaDeColumna } from '@/lib/columnas'

interface Props {
  columnas: MetaDeColumna[]
  visibles: string[]
  /** Devuelve la que se escondió para hacer sitio, si hizo falta. */
  onAlternar: (key: string) => string | null
  onRestablecer: () => void
}

/** Menú de columnas visibles. Las fijas salen marcadas y apagadas. */
export function ColumnasMenu({ columnas, visibles, onAlternar, onRestablecer }: Props) {
  const elegibles = columnas.filter((columna) => columna.header)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10! max-xl:w-10 max-xl:px-0"
          aria-label="Columnas"
        >
          <Columns3Icon />
          <span className="max-xl:sr-only">Columnas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center justify-between font-normal">
          <span className="text-sm font-semibold">Columnas</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {visibles.length} de {MAXIMO_DE_COLUMNAS}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {elegibles.map((columna) => (
          <DropdownMenuCheckboxItem
            key={columna.key}
            checked={visibles.includes(columna.key)}
            disabled={columna.fija}
            // El menu sigue abierto para marcar varias seguidas
            onSelect={(evento) => evento.preventDefault()}
            onCheckedChange={() => {
              const ocultada = onAlternar(columna.key)
              if (ocultada) {
                const nombre = columnas.find((cada) => cada.key === ocultada)?.header
                toast.info(`Se ocultó «${nombre}» para que quepan ${MAXIMO_DE_COLUMNAS}.`)
              }
            }}
          >
            {columna.header}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRestablecer}>
          <RotateCcwIcon className="size-4" />
          Las de siempre
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
