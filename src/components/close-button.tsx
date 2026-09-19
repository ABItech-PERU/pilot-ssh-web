import type { ComponentProps } from 'react'

import { cn } from 'cn'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Cierre de 36 px que, como todo boton, solo ensena el foco con teclado.
 *  Sustituye al de shadcn: 16 px y anillo tambien al abrir con raton. */
export function CloseButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cerrar"
      className={cn('text-muted-foreground absolute top-4 right-4', className)}
      {...props}
    >
      <XIcon />
    </Button>
  )
}
