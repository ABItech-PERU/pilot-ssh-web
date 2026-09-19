import { cn } from 'cn'

/** Ancho del sistema, el mismo en cabeceras, pies y contenido. El borde de
 *  una cabecera va a sangre; su contenido, dentro de este ancho. */
export function Container({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
