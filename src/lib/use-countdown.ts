import { useCallback, useEffect, useRef, useState } from 'react'

/** Cuenta atras para una espera impuesta por el servidor. Guarda el
 *  instante final: con la pestana dormida, el navegador congela intervalos. */
export function useCountdown(onFinish?: () => void) {
  const [remaining, setRemaining] = useState(0)
  const endsAt = useRef(0)
  const alTerminar = useRef(onFinish)

  useEffect(() => {
    alTerminar.current = onFinish
  }, [onFinish])

  const start = useCallback((seconds: number) => {
    endsAt.current = Date.now() + seconds * 1000
    setRemaining(seconds)
  }, [])

  useEffect(() => {
    if (remaining <= 0) return

    const intervalo = window.setInterval(() => {
      const restante = Math.ceil((endsAt.current - Date.now()) / 1000)
      if (restante > 0) {
        setRemaining(restante)
        return
      }
      setRemaining(0)
      alTerminar.current?.()
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [remaining])

  return { remaining, isRunning: remaining > 0, start }
}

/** `mm:ss` cuando pasa del minuto; `Ns` cuando no. */
export function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`

  const minutos = Math.floor(seconds / 60)
  const restantes = seconds % 60
  return `${minutos}:${String(restantes).padStart(2, '0')}`
}
