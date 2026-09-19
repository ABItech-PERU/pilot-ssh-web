import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { Comprobante } from '@/features/credits/comprobantes'

/** Comprobante traído con la sesión y su URL local, liberada al dejar de
 *  usarse. Solo se pide mientras `activo`. */
export function useComprobante(comprobante: Comprobante | null, activo: boolean) {
  const consulta = useQuery({
    queryKey: comprobante?.clave ?? ['comprobante'],
    // `queryFn` fijo y `enabled` decide: miniatura y visor comparten
    // consulta, y guardar la refresca aunque el visor esté cerrado
    queryFn: comprobante?.cargar ?? skipToken,
    enabled: activo,
    // Solo cambia si finanzas sube otro, y eso invalida la recarga
    staleTime: Infinity,
  })
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!consulta.data) {
      setUrl(null)
      return
    }
    const local = URL.createObjectURL(consulta.data)
    setUrl(local)
    return () => URL.revokeObjectURL(local)
  }, [consulta.data])

  return {
    archivo: consulta.data ?? null,
    url,
    error: consulta.error,
    reintentar: () => consulta.refetch(),
  }
}
