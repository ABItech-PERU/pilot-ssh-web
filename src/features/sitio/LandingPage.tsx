import {
  EyeOffIcon,
  FingerprintIcon,
  GlobeIcon,
  LayoutGridIcon,
  LockKeyholeIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TerminalIcon,
  TimerIcon,
  UsersIcon,
  WifiIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import pagoEfectivo from '@/assets/pagoefectivo.webp'
import panelEquipo from '@/assets/panel-equipo.webp'
import panelServidores from '@/assets/panel-servidores.webp'
import panelSesiones from '@/assets/panel-sesiones.webp'
import visaMastercard from '@/assets/visa-mastercard.webp'
import yape from '@/assets/yape.webp'
import { Container } from '@/components/container'
import { Button } from '@/components/ui/button'
import { Revelar } from '@/components/revelar'
import { TerminalDemo } from '@/components/terminal-demo'
import { Historia } from '@/features/sitio/Historia'
import {
  Bloque,
  BotonDeAlta,
  Captura,
  Enlace,
  LlamadaFinal,
  PreguntasFrecuentes,
  Regalo,
  Seccion,
  Titulo,
  useTituloDePagina,
} from '@/features/sitio/partes'
import { contar, diasQueCubre, EQUIPO_TIPICO } from '@/features/sitio/precios'
import { PREGUNTAS_GENERALES } from '@/features/sitio/preguntas'
import { TarifasResumen } from '@/features/sitio/TarifasResumen'
import { usePrecios } from '@/features/sitio/use-sitio'
import { formatCredits } from '@/lib/format'

const HECHOS = [
  { icono: GlobeIcon, texto: 'Sin instalar nada' },
  { icono: LockKeyholeIcon, texto: 'Contraseñas cifradas' },
  { icono: ScrollTextIcon, texto: 'Registro de cada acceso' },
]

/** Los medios de pago se reconocen antes por el logo que por el nombre. */
const MEDIOS_DE_PAGO = [
  { src: visaMastercard, alt: 'Visa y Mastercard', clase: 'h-6' },
  { src: yape, alt: 'Yape', clase: 'size-6 rounded-sm' },
  { src: pagoEfectivo, alt: 'PagoEfectivo', clase: 'h-6 rounded-sm' },
]

const SEGURIDAD = [
  { icono: LockKeyholeIcon, texto: 'Contraseñas y llaves cifradas' },
  { icono: EyeOffIcon, texto: 'Nadie de nuestro equipo puede verlas' },
  { icono: FingerprintIcon, texto: 'Servidor verificado en cada conexión' },
  { icono: ShieldCheckIcon, texto: 'Verificación en dos pasos' },
  { icono: TimerIcon, texto: 'Límite de intentos de acceso' },
  { icono: WifiIcon, texto: 'Todo viaja por HTTPS y SSH' },
]

export function LandingPage() {
  useTituloDePagina('/')

  return (
    <>
      <section className="pt-8 pb-14 sm:pt-14 lg:py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="max-w-lg">
            <h1 className="entrada text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Dé acceso a sus servidores sin entregar contraseñas
            </h1>
            <p className="entrada text-muted-foreground mt-4 text-base text-balance [--retraso:80ms] sm:text-lg">
              Su equipo entra desde el navegador. Usted decide quién, a qué servidor y
              hasta cuándo.
            </p>
            <div className="entrada mt-7 flex flex-col gap-4 [--retraso:160ms] sm:flex-row sm:items-center sm:gap-6">
              <BotonDeAlta className="w-full sm:w-auto" />
              <Button asChild variant="outline" size="lg" className="w-full sm:hidden">
                <Link to="/pricing">Ver precios</Link>
              </Button>
              <Enlace to="/pricing" className="hidden sm:inline-flex">
                Ver precios
              </Enlace>
            </div>
            <Regalo className="entrada mt-5 [--retraso:240ms]" />
          </div>

          <Historia />
        </Container>
      </section>

      <section className="border-y">
        <Container>
          <ul className="grid gap-x-6 gap-y-3 py-5 text-sm font-medium sm:grid-cols-2 lg:grid-cols-4">
            {HECHOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-2.5">
                <Icono className="text-primary size-4 shrink-0" aria-hidden />
                {texto}
              </li>
            ))}
            <li className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
              <span>Aceptamos</span>
              <span className="flex items-center gap-2">
                {MEDIOS_DE_PAGO.map(({ src, alt, clase }) => (
                  <img key={alt} src={src} alt={alt} className={clase} />
                ))}
              </span>
            </li>
          </ul>
        </Container>
      </section>

      <Seccion id="como-funciona" className="border-t-0">
        <Titulo descripcion="Añada un servidor, dé acceso y su equipo entra. Todo desde el panel.">
          Todo el control, sin complicaciones
        </Titulo>
        <div className="mt-14 space-y-16 lg:space-y-24">
          <Bloque
            icono={LayoutGridIcon}
            titulo="Todos sus servidores, en un solo panel"
            texto="Cada uno con sus credenciales, sus enlaces y quién lo usó por última vez. Se añaden con usuario y contraseña o llave, y quedan cifrados."
            visual={
              <Captura
                src={panelServidores}
                alt="El panel de Pilot SSH con los servidores de un equipo"
                ancho={1600}
                alto={1000}
              />
            }
          />
          <Bloque
            invertido
            icono={UsersIcon}
            titulo="Permisos por persona, grupo o etiqueta"
            texto="Ver, conectar o gestionar. Toda la organización, un servidor o una sola credencial. Con fecha de fin, se cierra solo."
            visual={
              <Captura
                src={panelEquipo}
                alt="El equipo de una organización con el rol y el acceso de cada persona"
                ancho={1400}
                alto={462}
              />
            }
          />
          <Bloque
            icono={ScrollTextIcon}
            titulo="Todo queda en el registro"
            texto="Quién entró, con qué credencial, cuándo, desde dónde y cuánto tiempo. También los intentos que fallaron."
            visual={
              <Captura
                src={panelSesiones}
                alt="Sesiones de un servidor: quién entró, con qué credencial, cuándo y desde dónde"
                ancho={1400}
                alto={476}
              />
            }
          />
          <Bloque
            invertido
            icono={TerminalIcon}
            titulo="La terminal, en el navegador"
            texto="Sin programas ni contraseñas compartidas. Su equipo abre la terminal desde el panel y la sesión queda en el registro."
            visual={<TerminalDemo />}
          />
        </div>
      </Seccion>

      <Seccion id="seguridad">
        <Titulo descripcion="Sus accesos, cifrados y bajo su control.">
          Pensado para proteger sus servidores
        </Titulo>
        <ul className="mt-8 grid max-w-4xl border-t sm:grid-cols-2">
          {SEGURIDAD.map(({ icono: Icono, texto }, indice) => (
            <li key={texto} className="border-b">
              <Revelar
                retraso={indice * 60}
                className="flex items-center gap-3 py-4 sm:pr-8"
              >
                <Icono className="text-muted-foreground size-4.5 shrink-0" aria-hidden />
                <span className="font-medium">{texto}</span>
              </Revelar>
            </li>
          ))}
        </ul>
        <Enlace to="/security" className="mt-8">
          Cómo protegemos sus accesos
        </Enlace>
      </Seccion>

      <Seccion id="precios">
        <Titulo descripcion="Sin planes ni mensualidades. Los créditos no caducan.">
          Pague solo los días de uso
        </Titulo>
        <TarifasResumen className="mt-8" />
        <RegaloEnDias />
        <Enlace to="/pricing" className="mt-8">
          Calcular mi precio
        </Enlace>
      </Seccion>

      <Seccion id="preguntas">
        <Titulo>Preguntas frecuentes</Titulo>
        <PreguntasFrecuentes preguntas={PREGUNTAS_GENERALES} />
      </Seccion>

      <LlamadaFinal />
    </>
  )
}

/** El regalo, traducido a días de trabajo de un equipo típico. */
function RegaloEnDias() {
  const { data: precios } = usePrecios()
  if (!precios) return null

  const dias = diasQueCubre(precios, precios.welcome_bonus, EQUIPO_TIPICO)
  if (!Number.isFinite(dias) || dias < 1) return null

  return (
    <p className="text-muted-foreground mt-5 max-w-2xl text-sm">
      Los {formatCredits(precios.welcome_bonus)} créditos de regalo dan para unos{' '}
      {contar(dias, 'día', 'días')} de uso a un equipo de{' '}
      {contar(EQUIPO_TIPICO.personas, 'persona', 'personas')} y{' '}
      {contar(EQUIPO_TIPICO.servidores, 'servidor', 'servidores')}.
    </p>
  )
}
