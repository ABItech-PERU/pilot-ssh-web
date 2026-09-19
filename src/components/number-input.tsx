import type { ComponentProps } from 'react'

import { Input } from '@/components/ui/input'

/** Campo numérico inmune a la rueda: el navegador cambia el valor de un
 *  `type="number"` enfocado al rodar. Al rodar suelta el foco y la página
 *  se desplaza; las flechas del teclado siguen sumando. */
export function NumberInput({ onWheel, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      type="number"
      onWheel={(evento) => {
        evento.currentTarget.blur()
        onWheel?.(evento)
      }}
    />
  )
}
