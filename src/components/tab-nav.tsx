import { NavLink } from 'react-router'

import { cn } from 'cn'

export interface Pestana {
  to: string
  etiqueta: string
  /** Lo que hay dentro, cuando ahorra entrar a mirarlo. */
  cuenta?: number | null
  /** La pestaña índice necesita `end`, o queda activa en todas las hijas. */
  end?: boolean
}

/** Pestañas de una pantalla. Son rutas: se enlazan, se guardan y el
 *  «atrás» del navegador vuelve a la anterior. */
export function TabNav({
  etiqueta,
  pestanas,
}: {
  etiqueta: string
  pestanas: Pestana[]
}) {
  return (
    <nav aria-label={etiqueta} className="border-b">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {pestanas.map((pestana) => (
          <li key={pestana.to}>
            <NavLink
              to={pestana.to}
              end={pestana.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )
              }
            >
              {pestana.etiqueta}
              {pestana.cuenta != null && (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                  {pestana.cuenta}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
