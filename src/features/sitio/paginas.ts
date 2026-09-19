export type RutaPublica = '/' | '/pricing' | '/security' | '/terms' | '/privacy'

export interface PaginaPublica {
  ruta: RutaPublica
  /** Dónde la deja la compilación dentro de `dist/`. */
  archivo: string
  titulo: string
  descripcion: string
  /** Para `sitemap.xml`. */
  prioridad: number
  /** Nombre corto de la página en las migas; el inicio no lleva. */
  migaDePan?: string
}

export const PAGINAS_PUBLICAS: PaginaPublica[] = [
  {
    ruta: '/',
    archivo: 'index.html',
    titulo: 'Pilot SSH · Acceso SSH seguro para equipos',
    descripcion:
      'Dé acceso a sus servidores sin entregar contraseñas. Terminal en el navegador, permisos con fecha de fin y registro de cada conexión.',
    prioridad: 1,
  },
  {
    ruta: '/pricing',
    migaDePan: 'Precios',
    archivo: 'pricing.html',
    titulo: 'Precios de Pilot SSH · Pague en soles por día de uso',
    descripcion:
      'Gratis para empezar. Pague solo los días que su equipo se conecta, con tarjeta, Yape o PagoEfectivo. Los créditos no caducan.',
    prioridad: 0.9,
  },
  {
    ruta: '/security',
    migaDePan: 'Seguridad',
    archivo: 'security.html',
    titulo: 'Seguridad en Pilot SSH · Contraseñas cifradas y registro',
    descripcion:
      'Contraseñas y llaves cifradas que nadie ve, servidores verificados, verificación en dos pasos y registro de cada acceso.',
    prioridad: 0.8,
  },
  {
    ruta: '/terms',
    migaDePan: 'Términos y condiciones',
    archivo: 'terms.html',
    titulo: 'Términos y condiciones · Pilot SSH',
    descripcion:
      'Condiciones de uso de Pilot SSH: su cuenta, los créditos, los pagos y las responsabilidades de cada parte.',
    prioridad: 0.3,
  },
  {
    ruta: '/privacy',
    migaDePan: 'Política de privacidad',
    archivo: 'privacy.html',
    titulo: 'Política de privacidad · Pilot SSH',
    descripcion:
      'Qué datos tratamos, para qué, con quién los compartimos y cómo ejercer sus derechos según la Ley 29733.',
    prioridad: 0.3,
  },
]

export function buscarPagina(ruta: RutaPublica): PaginaPublica {
  return PAGINAS_PUBLICAS.find((pagina) => pagina.ruta === ruta)!
}
