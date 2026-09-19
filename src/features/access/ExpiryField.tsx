import { CalendarClockIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatearDia } from '@/lib/periods'

/** Sin fecha es solo un botón: lo normal es que el acceso no caduque. */
export function ExpiryField({
  id,
  valor,
  onChange,
}: {
  id: string
  valor: string
  onChange: (valor: string) => void
}) {
  const hoy = formatearDia(new Date())

  if (!valor) {
    return (
      <Button variant="outline" size="sm" onClick={() => onChange(hoy)}>
        <CalendarClockIcon />
        Poner caducidad
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Caduca</Label>
        <Button variant="ghost" size="sm" onClick={() => onChange('')}>
          Quitar
        </Button>
      </div>
      <Input
        id={id}
        type="date"
        min={hoy}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
      />
    </div>
  )
}
