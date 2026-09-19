import { cn } from 'cn'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toApiError } from '@/lib/api-error'
import type { MetaDeColumna } from '@/lib/columnas'
import type { Vista } from '@/lib/use-listado'

/** Clases enteras: Tailwind no detecta las construidas por concatenacion. */
const VISIBLE_DESDE = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const

/** Hereda de MetaDeColumna lo que decide el menú «Columnas». */
export interface Columna<T> extends MetaDeColumna {
  key: string
  header: string
  /** `titulo` encabeza la tarjeta; `acciones` va a su esquina superior. */
  rol?: 'titulo' | 'acciones'
  /** Debajo de ese ancho la columna se retira de la tabla, no se estruja. */
  desde?: keyof typeof VISIBLE_DESDE
  /** Los números a la derecha; un botón solo en su celda, al centro. */
  alineacion?: 'derecha' | 'centro'
  /** Lineas del esqueleto en esta celda. */
  lineas?: 1 | 2
  /** Cuantos botones tiene la celda de acciones: el esqueleto los imita. */
  acciones?: number
  ancho?: string
  /** `indice` cuenta dentro de la pagina a la vista. */
  cell: (fila: T, indice: number) => React.ReactNode
}

/** Columna «N°», contada sobre la lista entera: con 20 por página, la
 *  página 2 empieza en 21. */
export function columnaDeNumero<T>(pagina: number, porPagina: number): Columna<T> {
  return {
    key: 'n',
    header: 'N°',
    fija: true,
    ancho: '5%',
    cell: (_fila, indice) => (
      <span className="text-muted-foreground text-xs tabular-nums">
        {(pagina - 1) * porPagina + indice + 1}
      </span>
    ),
  }
}

interface Props<T> {
  columnas: Columna<T>[]
  datos: T[]
  getKey: (fila: T) => string | number
  vista: Vista
  cargando: boolean
  error?: unknown
  onReintentar?: () => void
  /** Segun la causa: no tener nada no es lo mismo que no encontrar. */
  vacio: React.ReactNode
  /** Filas del esqueleto: las de la carga anterior o la pagina entera. */
  filasEsperadas?: number
}

/** Tabla en pantalla ancha y tarjetas en movil, con los cuatro estados en
 *  ambas. La tarjeta sale de las mismas columnas. */
export function DataTable<T>({
  columnas,
  datos,
  getKey,
  vista,
  cargando,
  error,
  onReintentar,
  vacio,
  filasEsperadas = 5,
}: Props<T>) {
  // Debajo de sm la tabla no cabe: manda tarjetas, la elija el usuario o no
  const clasesTabla = vista === 'tabla' ? 'hidden sm:block' : 'hidden'
  const clasesTarjetas = vista === 'tarjetas' ? 'block' : 'sm:hidden'

  const huesos = Math.min(filasEsperadas, 25)

  return (
    <>
      <div className={cn('overflow-x-auto rounded-lg border', clasesTabla)}>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columnas.map((columna) => (
                <TableHead
                  key={columna.key}
                  style={columna.ancho ? { width: columna.ancho } : undefined}
                  className={cn(
                    columna.desde && VISIBLE_DESDE[columna.desde],
                    columna.alineacion === 'derecha' && 'text-right',
                    columna.alineacion === 'centro' && 'text-center',
                  )}
                >
                  {columna.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody aria-busy={cargando}>
            {cargando ? (
              Array.from({ length: huesos }, (_, fila) => (
                <TableRow key={fila} className="hover:bg-transparent">
                  {columnas.map((columna) => (
                    <TableCell
                      key={columna.key}
                      className={cn(columna.desde && VISIBLE_DESDE[columna.desde])}
                    >
                      <CeldaEsqueleto columna={columna} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnas.length}>
                  <AvisoDeError error={error} onReintentar={onReintentar} />
                </TableCell>
              </TableRow>
            ) : datos.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnas.length} className="py-12 text-center">
                  {vacio}
                </TableCell>
              </TableRow>
            ) : (
              datos.map((fila, indice) => (
                <TableRow key={getKey(fila)}>
                  {columnas.map((columna) => (
                    <TableCell
                      key={columna.key}
                      className={cn(
                        '[overflow-wrap:anywhere]',
                        // El titulo salta de linea en vez de invadir la vecina
                        columna.rol === 'titulo' && 'whitespace-normal',
                        columna.desde && VISIBLE_DESDE[columna.desde],
                        columna.alineacion === 'derecha' && 'text-right',
                        columna.alineacion === 'centro' && 'text-center',
                      )}
                    >
                      {columna.cell(fila, indice)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className={clasesTarjetas}>
        {cargando ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: Math.min(huesos, 6) }, (_, indice) => (
              <li key={indice} className="rounded-lg border p-4">
                <Skeleton className="h-5 w-2/5" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="rounded-lg border p-4">
            <AvisoDeError error={error} onReintentar={onReintentar} />
          </div>
        ) : datos.length === 0 ? (
          <div className="rounded-lg border px-6 py-12 text-center">{vacio}</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {datos.map((fila, indice) => (
              <TarjetaDeFila
                key={getKey(fila)}
                columnas={columnas}
                fila={fila}
                indice={indice}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function TarjetaDeFila<T>({
  columnas,
  fila,
  indice,
}: {
  columnas: Columna<T>[]
  fila: T
  indice: number
}) {
  const titulo = columnas.find((columna) => columna.rol === 'titulo') ?? columnas[0]
  const acciones = columnas.find((columna) => columna.rol === 'acciones')
  const resto = columnas.filter(
    (columna) => columna !== titulo && columna.rol !== 'acciones',
  )

  return (
    <li className="rounded-lg border p-4 [overflow-wrap:anywhere]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{titulo?.cell(fila, indice)}</div>
        {/* Margen negativo: centra los botones de 32 px con la primera linea
            del titulo y los pega al borde */}
        {acciones && (
          <div className="-mt-1.5 -mr-2 shrink-0">{acciones.cell(fila, indice)}</div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {resto.map((columna) => (
          <div key={columna.key}>
            <dt className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase">
              {columna.header}
            </dt>
            <dd className="mt-1 text-sm">{columna.cell(fila, indice)}</dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

function CeldaEsqueleto<T>({ columna }: { columna: Columna<T> }) {
  if (columna.rol === 'acciones') {
    return (
      <div className="flex justify-end gap-1">
        {Array.from({ length: columna.acciones ?? 1 }, (_, indice) => (
          <Skeleton key={indice} className="size-8 rounded-md" />
        ))}
      </div>
    )
  }

  const dosLineas = columna.lineas === 2 || columna.rol === 'titulo'

  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-3/4" />
      {dosLineas && <Skeleton className="h-3 w-1/2" />}
    </div>
  )
}

function AvisoDeError({
  error,
  onReintentar,
}: {
  error: unknown
  onReintentar?: () => void
}) {
  const fallo = toApiError(error)

  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangleIcon className="text-destructive size-5" />
      <p className="text-sm font-medium">{fallo.message}</p>
      {onReintentar && fallo.isRetryable && (
        <Button variant="outline" size="sm" onClick={onReintentar}>
          <RefreshCwIcon />
          Reintentar
        </Button>
      )}
    </div>
  )
}
