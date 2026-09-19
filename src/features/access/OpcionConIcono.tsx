import { SelectItem } from '@/components/ui/select'

interface Props {
  valor: string
  icono: React.ElementType
  disabled?: boolean
  children: React.ReactNode
}

/** Mismo glifo que el chip del acceso concedido; queda en el selector al
 *  elegirla. */
export function OpcionConIcono({ valor, icono: Icono, disabled, children }: Props) {
  return (
    <SelectItem value={valor} disabled={disabled}>
      <Icono className="text-muted-foreground size-4 shrink-0" />
      {children}
    </SelectItem>
  )
}
