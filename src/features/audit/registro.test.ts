import {
  KeyRoundIcon,
  LockKeyholeIcon,
  ScrollTextIcon,
  ServerIcon,
  ShieldXIcon,
} from 'lucide-react'
import { describe, expect, it } from 'vitest'

import {
  esIntentoDenegado,
  iconoDeEntrada,
  nombreDelArchivo,
} from '@/features/audit/registro'

const entrada = (
  action: string,
  category: string,
  metadata: Record<string, unknown> = {},
) => ({
  action,
  category,
  metadata,
})

describe('iconoDeEntrada', () => {
  it('una credencial lleva su forma de entrar: candado la contraseña, llave la llave', () => {
    expect(
      iconoDeEntrada(
        entrada('credential.created', 'credentials', { auth_type: 'password' }),
      ),
    ).toBe(LockKeyholeIcon)
    expect(
      iconoDeEntrada(entrada('credential.deleted', 'credentials', { auth_type: 'key' })),
    ).toBe(KeyRoundIcon)
  })

  it('sin saber cómo entra, la llave de la categoría', () => {
    expect(iconoDeEntrada(entrada('credential.updated', 'credentials'))).toBe(
      KeyRoundIcon,
    )
  })

  it('lo demás lleva el de su tipo', () => {
    expect(iconoDeEntrada(entrada('server.created', 'servers'))).toBe(ServerIcon)
    expect(iconoDeEntrada(entrada('session.denied', 'denied'))).toBe(ShieldXIcon)
  })

  it('un tipo desconocido no deja la fila sin icono', () => {
    expect(iconoDeEntrada(entrada('algo.nuevo', 'nuevo'))).toBe(ScrollTextIcon)
  })
})

describe('esIntentoDenegado', () => {
  it('solo marca los intentos denegados', () => {
    expect(esIntentoDenegado({ category: 'denied' })).toBe(true)
    expect(esIntentoDenegado({ category: 'terminal' })).toBe(false)
  })
})

describe('nombreDelArchivo', () => {
  it('lleva el nombre del espacio tal cual', () => {
    expect(nombreDelArchivo('ABITech PERU')).toBe(
      'Pilot SSH - Auditoría - ABITech PERU.xlsx',
    )
  })

  it('sin lo que Windows no admite en un nombre', () => {
    expect(nombreDelArchivo('Acme: Perú / Chile')).toBe(
      'Pilot SSH - Auditoría - Acme Perú Chile.xlsx',
    )
    expect(nombreDelArchivo('Acme\\Perú')).toBe('Pilot SSH - Auditoría - Acme Perú.xlsx')
  })
})
