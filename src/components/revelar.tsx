import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'

type Estado = 'inicial' | 'oculto' | 'visible'

function prefiereQuietud() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Aparece al entrar en pantalla. Lo visible al cargar no se anima y el
 *  HTML compilado sale visible: solo se oculta, tras montar, lo de abajo. */
export function Revelar({
  children,
  className,
  retraso = 0,
}: {
  children: React.ReactNode
  className?: string
  /** Milisegundos, para escalonar hermanos. */
  retraso?: number
}) {
  const nodo = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<Estado>('inicial')

  useEffect(() => {
    const elemento = nodo.current
    if (!elemento) return
    if (prefiereQuietud() || elemento.getBoundingClientRect().top < window.innerHeight) {
      setEstado('visible')
      return
    }

    setEstado('oculto')
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return
        setEstado('visible')
        observador.disconnect()
      },
      // Arriba sin límite: lo saltado (un ancla, la tecla Fin) cuenta como
      // visto
      { rootMargin: '9999px 0px -10% 0px' },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return (
    <div
      ref={nodo}
      style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out',
        estado === 'oculto' && 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}
