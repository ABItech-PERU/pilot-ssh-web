import { Input } from '@/components/ui/input'
import { cn } from 'cn'

interface Props extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string
  onValueChange: (value: string) => void
}

/** Los seis digitos del correo. Descarta lo que no es cifra: se pega
 *  «123 456» tal cual. */
export function CodeInput({ value, onValueChange, className, ...props }: Props) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      placeholder="000000"
      className={cn(
        'font-machine h-12 text-center text-xl tracking-[0.5em] placeholder:tracking-[0.5em]',
        className,
      )}
      value={value}
      onChange={(evento) =>
        onValueChange(evento.target.value.replace(/\D/g, '').slice(0, 6))
      }
      {...props}
    />
  )
}
