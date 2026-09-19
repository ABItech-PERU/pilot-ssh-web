import { ScrollTextIcon, TerminalIcon, UserPlusIcon } from 'lucide-react'

import filaAcceso from '@/assets/fila-acceso.webp'
import { Revelar } from '@/components/revelar'
import filaSesion from '@/assets/fila-sesion.webp'

/** Un día con Pilot SSH en tres momentos reales del panel. */
export function Historia() {
  return (
    <ol className="relative min-w-0 space-y-7 border-l pl-8">
      <Momento
        icono={UserPlusIcon}
        hora="09:12"
        titulo="Ana da acceso a Elena"
        retraso={0}
      >
        <p className="text-muted-foreground text-sm">
          Solo a la credencial <code className="font-mono">deploy</code>, hasta el 16 de
          octubre.
        </p>
        <Fragmento
          src={filaAcceso}
          alt="Elena Vargas · Solo deploy · Hasta el 16 oct 2026"
          ancho={1200}
          alto={100}
        />
      </Momento>

      <Momento
        icono={TerminalIcon}
        hora="09:15"
        titulo="Elena entra desde el navegador"
        retraso={150}
      >
        <p className="text-muted-foreground text-sm">
          Sin instalar nada. Sin ver la contraseña.
        </p>
        <pre
          aria-hidden
          className="border-term-border bg-term-bg text-term-text mt-3 rounded-lg border px-4 py-3 font-mono text-[12.5px] leading-[1.8] whitespace-pre-wrap"
        >
          <span className="text-term-user">elena</span>
          <span className="text-term-dim">@</span>
          <span className="text-term-host">prod-web</span>
          <span className="text-term-dim">:~$ </span>
          sudo <span className="text-term-cmd">systemctl restart</span>{' '}
          <span className="text-term-arg">nginx</span>
          {'\n'}
          <span className="text-term-ok">✓</span>
          <span className="text-term-dim"> sesión abierta · 09:15</span>
        </pre>
      </Momento>

      <Momento
        icono={ScrollTextIcon}
        hora="09:27"
        titulo="La sesión queda en el registro"
        retraso={300}
      >
        <p className="text-muted-foreground text-sm">
          Quién, con qué credencial, desde dónde y cuánto tiempo.
        </p>
        <Fragmento
          src={filaSesion}
          alt="Beto Ramos · deploy · 16 sept 2026, 5:00 · Cerrada · 12 min"
          ancho={1200}
          alto={122}
        />
      </Momento>
    </ol>
  )
}

function Momento({
  icono: Icono,
  hora,
  titulo,
  retraso,
  children,
}: {
  icono: typeof UserPlusIcon
  hora: string
  titulo: string
  retraso: number
  children: React.ReactNode
}) {
  return (
    // Al cargar entra escalonado; al bajar (móvil) lo revela el observador
    <li
      className="entrada"
      style={{ '--retraso': `${200 + retraso}ms` } as React.CSSProperties}
    >
      <Revelar retraso={retraso} className="relative">
        {/* pl-8 de la lista + medio icono: el círculo monta sobre la línea */}
        <span className="bg-background text-muted-foreground absolute top-0 -left-11.25 grid size-6.5 place-items-center rounded-full border">
          <Icono className="size-3.5" />
        </span>
        <p className="flex items-baseline gap-3">
          <span className="text-muted-foreground font-mono text-xs">{hora}</span>
          <span className="font-medium">{titulo}</span>
        </p>
        <div className="mt-1">{children}</div>
      </Revelar>
    </li>
  )
}

/** Con medidas: reserva el hueco y nada salta al cargar la imagen. */
function Fragmento({
  src,
  alt,
  ancho,
  alto,
}: {
  src: string
  alt: string
  ancho: number
  alto: number
}) {
  return (
    // Oculto en teléfono: el recorte es ilegible y el texto basta
    <div className="bg-card mt-3 hidden overflow-hidden rounded-lg border sm:block">
      <img src={src} alt={alt} width={ancho} height={alto} className="w-full" />
    </div>
  )
}
