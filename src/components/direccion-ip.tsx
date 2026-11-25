import { Fragment } from 'react'

/** IP de un registro. Una IPv6 se parte tras sus dos puntos y no pisa la
 *  columna vecina. */
export function DireccionIp({
  valor,
  className = '',
}: {
  valor: string | null | undefined
  className?: string
}) {
  const clases = `font-machine text-xs whitespace-normal ${className}`
  if (!valor) return <span className={clases}>—</span>

  return (
    <span className={clases}>
      {valor.split(':').map((grupo, indice) => (
        <Fragment key={indice}>
          {indice > 0 && (
            <>
              :<wbr />
            </>
          )}
          {grupo}
        </Fragment>
      ))}
    </span>
  )
}
