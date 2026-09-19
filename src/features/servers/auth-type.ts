import { KeyRoundIcon, LockKeyholeIcon } from 'lucide-react'

import type { AuthType } from '@/types/api'

/** Glifo y nombre de cada forma de entrar: llave es llave, candado es
 *  contrasena. La llave de la barra lateral o de «Anadir credencial»
 *  nombra la categoria, no una credencial. */
export const FORMAS_DE_ENTRAR: Record<
  AuthType,
  { nombre: string; etiqueta: string; icono: React.ElementType }
> = {
  password: {
    nombre: 'Contraseña',
    etiqueta: 'Entra con contraseña',
    icono: LockKeyholeIcon,
  },
  key: { nombre: 'Llave', etiqueta: 'Entra con llave', icono: KeyRoundIcon },
}
