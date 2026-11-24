import { cn } from 'cn'

type Tono = 'clave' | 'texto' | 'valor' | 'nota'

const COLOR_DEL_TONO: Record<Tono, string> = {
  clave: 'bg-term-host/25',
  texto: 'bg-term-border',
  valor: 'bg-term-ok/20',
  nota: 'bg-term-dim/15',
}

/** Sangría en niveles y tramos en caracteres. Sin tramos, la línea va vacía. */
const FORMA: { sangria: number; tramos: [number, Tono][] }[] = [
  { sangria: 0, tramos: [[5, 'nota']] },
  { sangria: 0, tramos: [] },
  { sangria: 0, tramos: [[3, 'clave'], [34, 'texto']] },
  { sangria: 0, tramos: [[3, 'clave'], [28, 'texto']] },
  { sangria: 0, tramos: [[3, 'clave'], [41, 'texto']] },
  { sangria: 0, tramos: [] },
  { sangria: 0, tramos: [[22, 'nota']] },
  { sangria: 0, tramos: [[6, 'clave'], [12, 'texto'], [9, 'valor']] },
  { sangria: 1, tramos: [[8, 'clave'], [26, 'texto']] },
  { sangria: 2, tramos: [[14, 'texto'], [18, 'valor']] },
  { sangria: 2, tramos: [[10, 'texto'], [22, 'valor']] },
  { sangria: 1, tramos: [[2, 'texto']] },
  { sangria: 0, tramos: [] },
  { sangria: 1, tramos: [[6, 'clave'], [30, 'texto']] },
  { sangria: 2, tramos: [[24, 'texto'], [12, 'valor']] },
  { sangria: 1, tramos: [[2, 'texto']] },
  { sangria: 0, tramos: [[2, 'texto']] },
  { sangria: 0, tramos: [] },
]

/** Cubre de sobra una pantalla alta; lo que sobra queda oculto. */
const LINEAS = 64

/** Mientras llega el archivo, la silueta del editor con su margen numerado. */
export function EsqueletoDeCodigo({ className }: { className?: string }) {
  return (
    <div
      className={cn('bg-term-bg flex h-full overflow-hidden', className)}
      role="status"
      aria-label="Abriendo el archivo"
    >
      <div className="border-term-border w-12 shrink-0 border-r py-2" aria-hidden>
        {Array.from({ length: LINEAS }, (_, indice) => (
          <div key={indice} className="flex h-5 items-center justify-end pr-2.5">
            <span
              className="bg-term-border/70 h-2 rounded-sm"
              style={{ width: `${String(indice + 1).length}ch` }}
            />
          </div>
        ))}
      </div>
      <div className="font-machine min-w-0 flex-1 py-2 pl-3 text-[13px] motion-safe:animate-pulse" aria-hidden>
        {Array.from({ length: LINEAS }, (_, indice) => {
          const { sangria, tramos } = FORMA[indice % FORMA.length]!
          return (
            <div key={indice} className="flex h-5 items-center gap-[1ch]" style={{ paddingLeft: `${sangria * 4}ch` }}>
              {tramos.map(([ancho, tono], parte) => (
                <span
                  key={parte}
                  className={cn('h-2.5 shrink rounded-sm', COLOR_DEL_TONO[tono])}
                  style={{ width: `${ancho}ch` }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
