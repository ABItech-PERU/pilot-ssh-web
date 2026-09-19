import { ClockIcon, Loader2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCountdown, type useCountdown } from '@/lib/use-countdown'

interface Props {
  espera: ReturnType<typeof useCountdown>
  isSubmitting: boolean
  label: string
  /** Falta algo por rellenar: bloquea sin mostrar envío. */
  disabled?: boolean
}

/** Se bloquea mientras dura el límite de intentos. */
export function SubmitConEspera({ espera, isSubmitting, label, disabled }: Props) {
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      disabled={isSubmitting || disabled || espera.isRunning}
    >
      {espera.isRunning ? (
        <>
          <ClockIcon />
          Vuelva a intentarlo en {formatCountdown(espera.remaining)}
        </>
      ) : (
        <>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {label}
        </>
      )}
    </Button>
  )
}
