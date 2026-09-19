import { RepeatIcon, ServerIcon, UserIcon, UserPlusIcon } from 'lucide-react'
import { useId, useState } from 'react'

import pagoEfectivo from '@/assets/pagoefectivo.webp'
import visaMastercard from '@/assets/visa-mastercard.webp'
import yape from '@/assets/yape.webp'
import { Container } from '@/components/container'
import { Revelar } from '@/components/revelar'
import { Slider } from '@/components/ui/slider'
import {
  LlamadaFinal,
  PreguntasFrecuentes,
  Seccion,
  Titulo,
  useTituloDePagina,
} from '@/features/sitio/partes'
import { estimarCostoMensual, formatSoles, type Uso } from '@/features/sitio/precios'
import { PREGUNTAS_DE_PRECIOS } from '@/features/sitio/preguntas'
import { TarifasResumen } from '@/features/sitio/TarifasResumen'
import { usePrecios } from '@/features/sitio/use-sitio'
import { formatCredits, formatPrice } from '@/lib/format'

const COMO_SE_CUENTA = [
  {
    icono: UserIcon,
    titulo: 'Por persona',
    texto: 'Cuenta el día que abre al menos una terminal.',
  },
  {
    icono: ServerIcon,
    titulo: 'Por servidor',
    texto: 'Cuenta el día que alguien entra en él.',
  },
  {
    icono: RepeatIcon,
    titulo: 'Una vez al día',
    texto: 'Diez sesiones el mismo día cuentan una sola vez.',
  },
  {
    icono: UserPlusIcon,
    titulo: 'Añadir es gratis',
    texto: 'Personas y servidores no cuestan hasta que se usan.',
  },
]

export function PricingPage() {
  useTituloDePagina('/pricing')
  const { data: precios } = usePrecios()

  return (
    <>
      <section className="pt-8 pb-12 sm:py-16 lg:py-24">
        <Container>
          <h1 className="max-w-2xl text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            Precios simples, en soles
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-base sm:text-lg">
            Pague solo los días que su equipo se conecta. Sin planes ni mensualidades.
          </p>
          <TarifasResumen className="mt-8" />
        </Container>
      </section>

      <Seccion>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Titulo>Cómo se cuenta</Titulo>
            {/* Sin marco: la calculadora de al lado ya es la tarjeta */}
            <dl className="mt-6 divide-y">
              {COMO_SE_CUENTA.map(({ icono: Icono, titulo, texto }, indice) => (
                <Revelar key={titulo} retraso={indice * 60} className="flex gap-4 py-5">
                  <span className="text-primary grid size-9 shrink-0 place-items-center rounded-lg border">
                    <Icono className="size-4" aria-hidden />
                  </span>
                  <div>
                    <dt className="font-semibold">{titulo}</dt>
                    <dd className="text-muted-foreground mt-0.5">{texto}</dd>
                  </div>
                </Revelar>
              ))}
            </dl>
          </div>
          <Revelar retraso={120}>
            <Calculadora />
          </Revelar>
        </div>
      </Seccion>

      {precios && precios.packages.length > 0 && (
        <Seccion>
          <Titulo descripcion="Los créditos no caducan. Cuanto más recarga, más regalo.">
            Recargue cuando quiera
          </Titulo>
          <div className="mt-10 grid max-w-4xl divide-y rounded-lg border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {precios.packages.map((paquete, indice) => (
              <Revelar
                key={paquete.id}
                retraso={indice * 80}
                className={indice > 0 ? 'p-6 sm:border-l' : 'p-6'}
              >
                <p className="text-muted-foreground text-sm font-medium">
                  {paquete.name}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatPrice(paquete.price_amount, paquete.price_currency)}
                </p>
                <p className="mt-2 text-sm">
                  {formatCredits(paquete.total_credits)} créditos
                </p>
                {Number(paquete.bonus_credits) > 0 && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {formatCredits(paquete.bonus_credits)} de regalo
                  </p>
                )}
                {paquete.is_recommended && (
                  <p className="text-primary mt-3 text-xs font-medium">Recomendado</p>
                )}
              </Revelar>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <span className="text-muted-foreground text-sm">Pague con</span>
            <img src={visaMastercard} alt="Visa y Mastercard" className="h-7" />
            <img src={yape} alt="Yape" className="size-8 rounded-md" />
            <img src={pagoEfectivo} alt="PagoEfectivo" className="h-7 rounded-sm" />
          </div>
        </Seccion>
      )}

      <Seccion>
        <Titulo>Preguntas sobre los precios</Titulo>
        <PreguntasFrecuentes preguntas={PREGUNTAS_DE_PRECIOS} />
      </Seccion>

      <LlamadaFinal />
    </>
  )
}

const LIMITES: Record<keyof Uso, { etiqueta: string; max: number }> = {
  personas: { etiqueta: 'Personas que se conectan al día', max: 30 },
  servidores: { etiqueta: 'Servidores que se usan al día', max: 50 },
  dias: { etiqueta: 'Días de trabajo al mes', max: 31 },
}

function Calculadora() {
  const { data: precios } = usePrecios()
  const [uso, setUso] = useState<Uso>({ personas: 3, servidores: 5, dias: 22 })
  const id = useId()
  const mensual = precios ? estimarCostoMensual(precios, uso) : 0

  return (
    <div className="rounded-lg border p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Calcule su precio</h2>
      <div className="mt-6 space-y-6">
        {(Object.keys(LIMITES) as (keyof Uso)[]).map((clave) => (
          <div key={clave}>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor={`${id}-${clave}`} className="text-sm font-medium">
                {LIMITES[clave].etiqueta}
              </label>
              <span className="font-mono text-sm">{uso[clave]}</span>
            </div>
            <Slider
              id={`${id}-${clave}`}
              className="mt-3"
              min={1}
              max={LIMITES[clave].max}
              step={1}
              value={[uso[clave]]}
              onValueChange={([valor]) =>
                setUso((actual) => ({ ...actual, [clave]: valor ?? actual[clave] }))
              }
            />
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-baseline justify-between gap-4 border-t pt-6">
        <span className="text-muted-foreground text-sm">Pagaría al mes</span>
        <span className="text-3xl font-semibold tracking-tight">
          {mensual === 0 ? 'Gratis' : formatSoles(mensual)}
        </span>
      </div>
    </div>
  )
}
