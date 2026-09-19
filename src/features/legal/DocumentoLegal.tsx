import { Container } from '@/components/container'
import { VIGENTE_DESDE } from '@/features/legal/vigencia'
import { useSitio } from '@/features/sitio/use-sitio'

export interface Apartado {
  id: string
  titulo: string
  contenido: React.ReactNode
}

export function DocumentoLegal({
  titulo,
  resumen,
  apartados,
}: {
  titulo: string
  resumen: string
  apartados: Apartado[]
}) {
  return (
    <Container className="pt-8 pb-16 sm:py-20">
      <header className="max-w-3xl">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-4xl">
          {titulo}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">{resumen}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Vigente desde el {VIGENTE_DESDE}.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Contenido" className="hidden lg:block">
          <ol className="sticky top-24 space-y-2 text-sm">
            {apartados.map(({ id, titulo: nombre }, indice) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {indice + 1}. {nombre}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="max-w-3xl space-y-12 leading-relaxed">
          {apartados.map(({ id, titulo: nombre, contenido }, indice) => (
            <section key={id} id={id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight">
                {indice + 1}. {nombre}
              </h2>
              <div className="text-muted-foreground [&_a]:text-primary [&_strong]:text-foreground mt-3 space-y-3 [&_a]:font-medium [&_a]:hover:underline [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
                {contenido}
              </div>
            </section>
          ))}
        </article>
      </div>
    </Container>
  )
}

/** Razón social, RUC, domicilio y contacto, del `.env` de la API. */
export function Titular() {
  const { data: sitio } = useSitio()
  if (!sitio) return null

  const { company, support } = sitio
  const nombre = company.legal_name || company.name
  return (
    <ul>
      <li>
        <strong>{nombre}</strong>
        {company.legal_name && company.name && ` («${company.name}»)`}
      </li>
      {company.ruc && <li>RUC: {company.ruc}</li>}
      {company.address && <li>Domicilio: {company.address}</li>}
      {support.email && (
        <li>
          Correo: <a href={`mailto:${support.email}`}>{support.email}</a>
        </li>
      )}
      {support.phone && <li>Teléfono y WhatsApp: {support.phone}</li>}
    </ul>
  )
}

export function CorreoDeContacto() {
  const { data: sitio } = useSitio()
  const correo = sitio?.support.email
  return correo ? (
    <a href={`mailto:${correo}`}>{correo}</a>
  ) : (
    <>nuestro correo de soporte</>
  )
}
