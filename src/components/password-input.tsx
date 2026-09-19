import { cn } from 'cn'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'

type Props = Omit<React.ComponentProps<'input'>, 'type'>

/** Campo de contrasena con opcion de verla. */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const Icono = visible ? EyeOffIcon : EyeIcon

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
        {...props}
      />

      <button
        type="button"
        onClick={() => setVisible((actual) => !actual)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-ring absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md transition-colors focus-visible:-outline-offset-2 focus-visible:outline-1"
      >
        <Icono className="size-4" />
      </button>
    </div>
  )
}
