import {
  Building2Icon,
  CoinsIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  SquareTerminalIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'

import { FORMAS_DE_ENTRAR } from '@/features/servers/auth-type'
import type { AuditEntry, AuthType } from '@/types/api'
import { nombreDeArchivo } from '@/lib/download'

/** Icono por categoría, si la entrada no trae uno más preciso. El nombre
 *  de la categoría lo pone el servidor, también en el Excel. */
const ICONOS: Record<string, React.ElementType> = {
  terminal: SquareTerminalIcon,
  denied: ShieldXIcon,
  servers: ServerIcon,
  credentials: KeyRoundIcon,
  access: ShieldCheckIcon,
  team: UsersIcon,
  organization: Building2Icon,
  credits: CoinsIcon,
  account: UserIcon,
}

/** Una credencial lleva el icono de su forma de entrar, el mismo que en su
 *  fila, no el del servidor; si no se sabe, la llave de la categoría. */
export function iconoDeEntrada(
  entrada: Pick<AuditEntry, 'action' | 'category' | 'metadata'>,
): React.ElementType {
  if (entrada.action.startsWith('credential.')) {
    const tipo = entrada.metadata.auth_type
    return typeof tipo === 'string' && tipo in FORMAS_DE_ENTRAR
      ? FORMAS_DE_ENTRAR[tipo as AuthType].icono
      : KeyRoundIcon
  }
  return ICONOS[entrada.category] ?? ScrollTextIcon
}

/** Lo más buscado: va en rojo y con frase, que el color solo no basta. */
export function esIntentoDenegado(entrada: Pick<AuditEntry, 'category'>): boolean {
  return entrada.category === 'denied'
}

/** Sin periodo: va dentro del archivo, arriba del todo. */
export function nombreDelArchivo(espacio: string): string {
  return nombreDeArchivo('Auditoría', espacio)
}
