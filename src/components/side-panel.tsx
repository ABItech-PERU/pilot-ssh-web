import type { ComponentProps } from 'react'

import { cn } from 'cn'

import { CloseButton } from '@/components/close-button'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetContent, SheetFooter, SheetHeader } from '@/components/ui/sheet'

/** El foco entra en el panel, no en su primer boton: recien cargada la
 *  pagina, el navegador pintaria el anillo aunque se abra con raton. Tab
 *  lleva al primer control. */
function enfocarPanel(event: Event) {
  event.preventDefault()
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
}

/** Panel lateral derecho de fichas, credenciales y enlaces. Cabecera y pie
 *  quedan fijos; solo rueda el cuerpo. */
export function SidePanelContent({
  className,
  ...props
}: ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      showCloseButton={false}
      onOpenAutoFocus={enfocarPanel}
      className={cn(
        'flex w-full flex-col gap-0 overflow-hidden p-0 outline-hidden sm:max-w-md',
        className,
      )}
      {...props}
    />
  )
}

/** Lo que rueda. `min-h-0` deja encoger al hijo de un flex; si no, el
 *  cuerpo crece y arrastra al panel. */
export function SidePanelBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)} {...props} />
}

/** Fija arriba: titulo y cierre siguen a la vista. `pr-14` deja hueco al
 *  boton. */
export function SidePanelHeader({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetHeader>) {
  return (
    <SheetHeader
      className={cn('bg-background shrink-0 gap-1 border-b p-5 pr-14', className)}
      {...props}
    >
      {children}
      <SheetClose asChild>
        <CloseButton />
      </SheetClose>
    </SheetHeader>
  )
}

/** Fijo abajo: «Cerrar» y, al lado, la accion principal. Sin accion, el
 *  cierre ocupa todo el ancho. */
export function SidePanelFooter({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetFooter>) {
  return (
    <SheetFooter className={cn('flex-row border-t p-5', className)} {...props}>
      <SheetClose asChild>
        <Button variant="outline" className={children ? undefined : 'flex-1'}>
          Cerrar
        </Button>
      </SheetClose>
      {children}
    </SheetFooter>
  )
}
