import type { ComponentProps } from 'react'

import { cn } from 'cn'

import { CloseButton } from '@/components/close-button'
import { DialogClose, DialogContent } from '@/components/ui/dialog'

/** Dialogo de formulario: ancho de lectura, scroll propio en pantallas
 *  bajas y el mismo cierre que los paneles; la cabecera deja hueco al boton.
 *
 *  `min-w-0` en cada hijo: en una rejilla miden por su contenido, y un
 *  nombre largo sin espacios ensancharia el dialogo. */
export function FormDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn(
        'max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg [&>*]:min-w-0 [&_[data-slot=dialog-header]]:pr-8',
        className,
      )}
      {...props}
    >
      {children}
      <DialogClose asChild>
        <CloseButton />
      </DialogClose>
    </DialogContent>
  )
}
