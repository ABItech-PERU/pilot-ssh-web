import { contar, describirTarifa } from '@/features/sitio/precios'
import type { PaginaPublica } from '@/features/sitio/paginas'
import { PREGUNTAS_GENERALES } from '@/features/sitio/preguntas'
import type { PublicPricing, SiteInfo } from '@/types/api'

interface Contexto {
  sitioUrl: string
  logoUrl: string
  sitio: SiteInfo
  precios: PublicPricing
}

/** schema.org para Google: quién ofrece el servicio, qué es y cuánto cuesta. */
export function buildStructuredData(pagina: PaginaPublica, contexto: Contexto): object[] {
  if (pagina.ruta === '/terms' || pagina.ruta === '/privacy') return []

  const organizacion = buildOrganization(contexto)
  const bloques: object[] = [organizacion]
  if (pagina.ruta === '/') {
    bloques.push(
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Pilot SSH',
        url: contexto.sitioUrl,
      },
      buildApplication(contexto),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PREGUNTAS_GENERALES.map(({ pregunta, respuesta }) => ({
          '@type': 'Question',
          name: pregunta,
          acceptedAnswer: { '@type': 'Answer', text: respuesta },
        })),
      },
    )
  }
  if (pagina.ruta === '/pricing') bloques.push(buildApplication(contexto))
  if (pagina.ruta !== '/') bloques.push(buildBreadcrumb(pagina, contexto))
  return bloques
}

function buildBreadcrumb(pagina: PaginaPublica, { sitioUrl }: Contexto) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: sitioUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: pagina.migaDePan,
        item: `${sitioUrl}${pagina.ruta}`,
      },
    ],
  }
}

function buildOrganization({ sitio, sitioUrl, logoUrl }: Contexto) {
  const { company, support, social } = sitio
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name || company.legal_name,
    ...(company.legal_name && { legalName: company.legal_name }),
    ...(company.ruc && { taxID: company.ruc }),
    url: sitioUrl,
    logo: logoUrl,
    ...(company.address && { address: company.address }),
    sameAs: Object.values(social).filter(Boolean),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: 'es',
      ...(support.email && { email: support.email }),
      ...(support.phone && { telephone: support.phone.replaceAll(' ', '') }),
    },
  }
}

function buildApplication({ sitio, precios, sitioUrl }: Contexto) {
  const persona = describirTarifa(precios, 'member')
  const servidor = describirTarifa(precios, 'server')
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Pilot SSH',
    url: sitioUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'es',
    publisher: {
      '@type': 'Organization',
      name: sitio.company.name || sitio.company.legal_name,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: precios.currency,
      description: `Gratis cada día para ${contar(persona.gratis, 'persona', 'personas')} y ${contar(servidor.gratis, 'servidor', 'servidores')}. Luego, pago por día de uso.`,
    },
  }
}
