import { env } from '@/lib/env'

/** Solo en UAT: que nadie confunda pruebas con producción. */
export function AvisoDeAmbiente() {
  if (env.ambiente !== 'uat') return null

  return (
    <div
      role="note"
      className="bg-warning px-4 py-1 text-center text-xs font-medium text-black"
    >
      Ambiente de pruebas: los pagos no cobran y los datos no son reales.
    </div>
  )
}
