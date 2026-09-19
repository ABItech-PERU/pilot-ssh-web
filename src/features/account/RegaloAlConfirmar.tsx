import { describirGratuito } from '@/features/credits/tarifas'
import { useTarifas } from '@/features/credits/use-creditos'

/** Lo que se gana al confirmar, con cifras: «lo gratuito de cada día» no
 *  dice nada a quien acaba de llegar. Tarifas en camino: barra en línea,
 *  el texto se parte igual al llegar. */
export function RegaloAlConfirmar() {
  const tarifas = useTarifas()

  if (tarifas.isPending) {
    return (
      <>
        500 créditos de regalo, más{' '}
        <span className="bg-accent inline-block h-3.5 w-40 animate-pulse rounded-md align-middle" />{' '}
        gratis cada día
      </>
    )
  }

  const gratis = tarifas.data && describirGratuito(tarifas.data)
  return gratis ? (
    <>500 créditos de regalo, más {gratis} gratis cada día</>
  ) : (
    <>500 créditos de regalo</>
  )
}
