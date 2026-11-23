import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/components/theme-provider'

type Posicion = NonNullable<ToasterProps['position']>

interface Ubicacion {
  position: Posicion
  top: number
}

let elegida: Ubicacion | null = null
const oyentes = new Set<() => void>()

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

const elegir = (ubicacion: Ubicacion | null) => {
  elegida = ubicacion
  for (const oyente of oyentes) oyente()
}

/** Una pantalla que no debe taparse mueve los avisos mientras está abierta.
 *  `top` es la distancia desde arriba; null espera a que se mida. */
export function useUbicacionDeAvisos(position: Posicion, top: number | null) {
  useEffect(() => {
    if (top === null) return
    elegir({ position, top })
    return () => elegir(null)
  }, [position, top])
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const ubicacion = useSyncExternalStore(suscribir, () => elegida)
  const desplazamiento = ubicacion && { top: ubicacion.top, left: 16, right: 16 }

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
      {...(ubicacion && {
        position: ubicacion.position,
        offset: desplazamiento ?? undefined,
        mobileOffset: desplazamiento ?? undefined,
      })}
    />
  )
}

export { Toaster }
