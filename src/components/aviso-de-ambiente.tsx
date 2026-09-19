import { env } from '@/lib/env'

/** Solo en UAT: que nadie confunda pruebas con producción. Fija arriba;
 *  `data-aviso-ambiente` activa `--alto-aviso`, que las pantallas descuentan. */
export function AvisoDeAmbiente() {
  if (env.ambiente !== 'uat') return null

  return (
    <div
      role="note"
      data-aviso-ambiente
      className="bg-warning sticky top-0 z-40 flex h-(--alto-aviso) items-center justify-center px-4 text-xs font-medium text-black"
    >
      <span className="truncate sm:hidden">Ambiente de pruebas</span>
      <span className="truncate max-sm:hidden">
        Ambiente de pruebas: los pagos no cobran y los datos no son reales.
      </span>
    </div>
  )
}
