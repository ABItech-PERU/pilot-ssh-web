import {
  CalendarClockIcon,
  CreditCardIcon,
  EyeOffIcon,
  FingerprintIcon,
  LockKeyholeIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  WifiIcon,
} from 'lucide-react'

import { Container } from '@/components/container'
import { Revelar } from '@/components/revelar'
import { LlamadaFinal, Seccion, useTituloDePagina } from '@/features/sitio/partes'
import { useSitio } from '@/features/sitio/use-sitio'

const MEDIDAS = [
  {
    icono: LockKeyholeIcon,
    titulo: 'Contraseñas y llaves cifradas',
    texto: 'Se guardan cifradas y nunca se envían al navegador.',
  },
  {
    icono: EyeOffIcon,
    titulo: 'Nadie de nuestro equipo las ve',
    texto: 'El personal de Pilot SSH no puede leerlas ni entrar a sus servidores.',
  },
  {
    icono: FingerprintIcon,
    titulo: 'Servidores verificados',
    texto: 'Guardamos la huella de cada servidor. Si cambia, la conexión se bloquea.',
  },
  {
    icono: CalendarClockIcon,
    titulo: 'Acceso justo y con fecha de fin',
    texto: 'Cada persona abre solo lo que se le dio, y hasta cuando se le dio.',
  },
  {
    icono: ScrollTextIcon,
    titulo: 'Registro de cada acceso',
    texto: 'Quién entró, a qué servidor, cuándo y desde qué dirección.',
  },
  {
    icono: ShieldCheckIcon,
    titulo: 'Cuentas protegidas',
    texto:
      'Verificación en dos pasos, límite de intentos y cierre de sesiones a distancia.',
  },
  {
    icono: WifiIcon,
    titulo: 'Conexión cifrada',
    texto: 'Todo viaja por HTTPS y SSH.',
  },
  {
    icono: CreditCardIcon,
    titulo: 'Pagos seguros',
    texto: 'Las tarjetas las procesa Mercado Pago. No pasan por nuestros servidores.',
  },
]

export function SecurityPage() {
  useTituloDePagina('/security')
  const { data: sitio } = useSitio()
  const correo = sitio?.support.email

  return (
    <>
      <section className="pt-8 pb-12 sm:py-16 lg:py-24">
        <Container>
          <h1 className="max-w-2xl text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            Cómo protegemos sus accesos
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-base sm:text-lg">
            Sus servidores y sus datos, cifrados y bajo su control.
          </p>
        </Container>
      </section>

      <Seccion>
        <dl className="bg-border grid max-w-5xl gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
          {MEDIDAS.map(({ icono: Icono, titulo, texto }, indice) => (
            <div key={titulo} className="bg-background p-6">
              <Revelar retraso={(indice % 2) * 80} className="flex gap-4">
                <span className="text-primary grid size-9 shrink-0 place-items-center rounded-lg border">
                  <Icono className="size-4" aria-hidden />
                </span>
                <div>
                  <dt className="font-semibold">{titulo}</dt>
                  <dd className="text-muted-foreground mt-1">{texto}</dd>
                </div>
              </Revelar>
            </div>
          ))}
        </dl>

        {correo && (
          <p className="text-muted-foreground mt-10">
            ¿Encontró una vulnerabilidad? Escríbanos a{' '}
            <a
              href={`mailto:${correo}`}
              className="text-foreground font-medium hover:underline"
            >
              {correo}
            </a>
            .
          </p>
        )}
      </Seccion>

      <LlamadaFinal />
    </>
  )
}
