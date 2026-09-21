import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

/** Imagen y no SVG en línea: el enlace lleva el correo, y nada ajeno se
 *  pinta como HTML. Fondo blanco siempre: en oscuro, algunas apps no lo
 *  leen. */
export function CodigoQR({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [imagen, setImagen] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    QRCode.toDataURL(valor, { margin: 1, width: 352, errorCorrectionLevel: 'M' })
      .then((url) => vigente && setImagen(url))
      .catch(() => vigente && setImagen(null))
    return () => {
      vigente = false
    }
  }, [valor])

  if (!imagen) return <Skeleton className="size-44 rounded-lg" />

  return (
    <img
      src={imagen}
      alt={etiqueta}
      className="size-44 rounded-lg border bg-white p-1.5"
      draggable={false}
    />
  )
}
