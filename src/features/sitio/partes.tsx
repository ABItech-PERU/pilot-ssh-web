import { cn } from 'cn'
import { ArrowRightIcon, CheckIcon, GiftIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'

import { Container } from '@/components/container'
import { Revelar } from '@/components/revelar'
import { WhatsappIcon } from '@/components/iconos-de-marca'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { buscarPagina, type RutaPublica } from '@/features/sitio/paginas'
import type { Pregunta } from '@/features/sitio/preguntas'
import { contar, describirTarifa } from '@/features/sitio/precios'
import { usePrecios, useSitio } from '@/features/sitio/use-sitio'
import { formatCredits } from '@/lib/format'

/** Título de la pestaña al navegar; el resto de la cabecera va en el HTML. */
export function useTituloDePagina(ruta: RutaPublica) {
  useEffect(() => {
    document.title = buscarPagina(ruta).titulo
  }, [ruta])
}

export function Seccion({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={cn('scroll-mt-16 border-t py-16 lg:py-20', className)}>
      <Container>{children}</Container>
    </section>
  )
}

export function Titulo({
  children,
  descripcion,
  className,
}: {
  children: React.ReactNode
  descripcion?: string
  className?: string
}) {
  return (
    <Revelar className={cn('max-w-2xl', className)}>
      <h2 className="text-[1.375rem] leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
        {children}
      </h2>
      {descripcion && (
        <p className="text-muted-foreground mt-3 text-base sm:text-lg">{descripcion}</p>
      )}
    </Revelar>
  )
}

/** El botón principal de todas las páginas. Con sesión, lleva al panel. */
export function BotonDeAlta({ className }: { className?: string }) {
  const { isAuthenticated } = useSession()

  return (
    <Button asChild size="lg" className={cn('px-5', className)}>
      <Link to={isAuthenticated ? '/app/servers' : '/register'}>
        {isAuthenticated ? 'Ir al panel' : 'Crear cuenta gratis'}
      </Link>
    </Button>
  )
}

/** El regalo, donde se decide registrarse. */
export function Regalo({ className }: { className?: string }) {
  const { data: precios } = usePrecios()

  // Hueco reservado desde el inicio: al llegar los precios no empuja nada
  return (
    <p className={cn('flex min-h-5 items-center gap-2 text-sm', className)}>
      {precios && (
        <>
          <GiftIcon className="text-primary size-4 shrink-0" />
          <span>
            <strong className="font-semibold">
              {formatCredits(precios.welcome_bonus)} créditos de regalo
            </strong>{' '}
            al confirmar su correo. Sin tarjeta.
          </span>
        </>
      )}
    </p>
  )
}

export function Enlace({
  to,
  children,
  className,
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'hover:text-primary inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline',
        className,
      )}
    >
      {children}
      <ArrowRightIcon className="size-4" />
    </Link>
  )
}

/** Una captura real del panel, con el marco justo. */
export function Captura({
  src,
  alt,
  ancho,
  alto,
  className,
}: {
  src: string
  alt: string
  ancho: number
  alto: number
  className?: string
}) {
  return (
    <div className={cn('bg-card overflow-hidden rounded-lg border', className)}>
      <img
        src={src}
        alt={alt}
        width={ancho}
        height={alto}
        loading="lazy"
        className="w-full"
      />
    </div>
  )
}

/** Un beneficio: texto a un lado, captura al otro. Se alternan. */
export function Bloque({
  icono: Icono,
  titulo,
  texto,
  visual,
  invertido = false,
}: {
  icono: typeof GiftIcon
  titulo: string
  texto: string
  visual: React.ReactNode
  invertido?: boolean
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <Revelar className={cn('max-w-md', invertido && 'lg:order-2')}>
        <Icono className="text-primary size-5" aria-hidden />
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-balance sm:text-xl">
          {titulo}
        </h3>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg">{texto}</p>
      </Revelar>
      <Revelar retraso={120} className={cn(invertido && 'lg:order-1')}>
        {visual}
      </Revelar>
    </div>
  )
}

export function PreguntasFrecuentes({ preguntas }: { preguntas: Pregunta[] }) {
  return (
    <Revelar>
      <Accordion type="single" collapsible className="mt-8 max-w-3xl">
        {preguntas.map(({ pregunta, respuesta }) => (
          <AccordionItem key={pregunta} value={pregunta}>
            <AccordionTrigger className="text-base font-medium">
              {pregunta}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              {respuesta}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Revelar>
  )
}

/** El cierre: la oferta concreta y dos formas de seguir, registrarse o
 *  preguntar. Lo gratuito sale de las tarifas reales. */
export function LlamadaFinal() {
  const { data: precios } = usePrecios()
  const { data: sitio } = useSitio()
  const persona = precios && describirTarifa(precios, 'member')
  const servidor = precios && describirTarifa(precios, 'server')
  const ventajas = [
    precios &&
      `${formatCredits(precios.welcome_bonus)} créditos de regalo al confirmar su correo`,
    persona &&
      servidor &&
      `Cada día, ${contar(persona.gratis, 'persona', 'personas')} y ${contar(servidor.gratis, 'servidor', 'servidores')} sin costo`,
    'Sin tarjeta. Sin mensualidad.',
  ].filter((ventaja): ventaja is string => Boolean(ventaja))

  return (
    <Seccion>
      <Revelar className="bg-card grid gap-10 rounded-lg border p-8 sm:p-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-16 lg:p-14">
        <div>
          <h2 className="text-[1.375rem] leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
            Empiece hoy. Es gratis.
          </h2>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Cree su cuenta, añada un servidor y dé el primer acceso en menos de cinco
            minutos.
          </p>
          <ul className="mt-6 space-y-2.5">
            {ventajas.map((ventaja) => (
              <li key={ventaja} className="flex items-center gap-2.5 text-sm font-medium">
                <CheckIcon className="text-primary size-4 shrink-0" aria-hidden />
                {ventaja}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-background rounded-lg border p-6">
          <BotonDeAlta className="h-11 w-full" />
          {sitio?.support.whatsapp && (
            <Button asChild variant="outline" className="mt-3 h-11 w-full">
              <a
                href={`https://wa.me/${sitio.support.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsappIcon className="size-4" />
                Escribir por WhatsApp
              </a>
            </Button>
          )}
        </div>
      </Revelar>
    </Seccion>
  )
}
