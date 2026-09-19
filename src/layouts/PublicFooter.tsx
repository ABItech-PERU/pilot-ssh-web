import { MailIcon, PhoneIcon } from 'lucide-react'
import { Link } from 'react-router'

import abitechPeru from '@/assets/abitech-peru.webp'
import { BrandLockup } from '@/components/brand'
import { Container } from '@/components/container'
import {
  FacebookIcon,
  GithubIcon,
  LinkedinIcon,
  WhatsappIcon,
} from '@/components/iconos-de-marca'
import { useSitio } from '@/features/sitio/use-sitio'

const COLUMNAS = [
  {
    titulo: 'Producto',
    enlaces: [
      { to: '/#como-funciona', label: 'Cómo funciona' },
      { to: '/pricing', label: 'Precios' },
      { to: '/security', label: 'Seguridad' },
    ],
  },
  {
    titulo: 'Cuenta',
    enlaces: [
      { to: '/register', label: 'Crear cuenta' },
      { to: '/login', label: 'Iniciar sesión' },
    ],
  },
  {
    titulo: 'Legal',
    enlaces: [
      { to: '/terms', label: 'Términos y condiciones' },
      { to: '/privacy', label: 'Política de privacidad' },
    ],
  },
]

export function PublicFooter() {
  const { data: sitio } = useSitio()
  const redes = sitio
    ? [
        { url: sitio.social.facebook, nombre: 'Facebook', icono: FacebookIcon },
        { url: sitio.social.linkedin, nombre: 'LinkedIn', icono: LinkedinIcon },
        { url: sitio.social.github, nombre: 'GitHub', icono: GithubIcon },
      ].filter((red) => red.url)
    : []
  const empresa = sitio?.company.legal_name || sitio?.company.name

  return (
    <footer className="bg-muted/30 border-t">
      <Container className="grid grid-cols-2 gap-x-4 gap-y-10 py-16 sm:gap-x-6 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.1fr_1.4fr]">
        <div className="col-span-2 space-y-4 lg:col-span-1">
          <BrandLockup />
          <p className="text-muted-foreground max-w-xs text-sm">
            Acceso SSH seguro para equipos, desde el navegador.
          </p>
          {redes.length > 0 && (
            <ul className="flex gap-2">
              {redes.map(({ url, nombre, icono: Icono }) => (
                <li key={nombre}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={nombre}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-9 place-items-center rounded-md transition-colors"
                  >
                    <Icono className="size-4.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {COLUMNAS.map(({ titulo, enlaces }) => (
          <nav
            key={titulo}
            aria-label={titulo}
            className={titulo === 'Legal' ? 'col-span-2 sm:col-span-1' : undefined}
          >
            <p className="text-sm font-semibold">{titulo}</p>
            <ul className="mt-4 space-y-3">
              {enlaces.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {sitio && (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-semibold">Soporte</p>
            <ul className="mt-4 space-y-3 text-sm">
              {sitio.support.email && (
                <li>
                  <a
                    href={`mailto:${sitio.support.email}`}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <MailIcon className="size-4 shrink-0" />
                    {sitio.support.email}
                  </a>
                </li>
              )}
              {sitio.support.whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${sitio.support.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <WhatsappIcon className="size-4 shrink-0" />
                    WhatsApp
                  </a>
                </li>
              )}
              {sitio.support.phone && (
                <li>
                  <a
                    href={`tel:${sitio.support.phone.replaceAll(' ', '')}`}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <PhoneIcon className="size-4 shrink-0" />
                    {sitio.support.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </Container>

      <div className="border-t">
        <Container className="text-muted-foreground flex flex-col items-center justify-between gap-4 py-6 text-sm sm:flex-row">
          <p>
            © {new Date().getFullYear()} {empresa ?? 'Pilot SSH'}
            {sitio?.company.ruc && ` · RUC ${sitio.company.ruc}`}
          </p>
          <p className="flex items-center gap-3">
            Un producto de
            <img src={abitechPeru} alt="ABItech Perú" className="h-10 w-auto" />
          </p>
        </Container>
      </div>
    </footer>
  )
}
