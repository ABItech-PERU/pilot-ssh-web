import { HistoryIcon, LogInIcon, LogOutIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import {
  esEquipoNuevo,
  estadoDeSesion,
  iconoDeActividad,
} from '@/features/account/actividad'

describe('iconoDeActividad', () => {
  it('entrar y salir llevan cada uno el suyo', () => {
    expect(iconoDeActividad('account.signed_in')).toBe(LogInIcon)
    expect(iconoDeActividad('account.signed_out')).toBe(LogOutIcon)
  })

  it('lo que no conozca no deja la fila sin icono', () => {
    expect(iconoDeActividad('account.algo_nuevo')).toBe(HistoryIcon)
  })
})

describe('esEquipoNuevo', () => {
  it('solo marca el equipo que nunca había entrado', () => {
    expect(esEquipoNuevo({ metadata: { new_device: true } })).toBe(true)
    expect(esEquipoNuevo({ metadata: { new_device: false } })).toBe(false)
    expect(esEquipoNuevo({ metadata: {} })).toBe(false)
  })
})

describe('estadoDeSesion', () => {
  const inicio = { action: 'account.signed_in', target_id: 'equipo-1' }
  const abiertas = new Set(['equipo-1'])

  it('la de este equipo se distingue de las demás abiertas', () => {
    expect(estadoDeSesion(inicio, abiertas, 'equipo-1')).toBe('actual')
    expect(estadoDeSesion(inicio, abiertas, 'otro')).toBe('abierta')
  })

  it('un equipo que ya salió queda cerrado', () => {
    expect(estadoDeSesion(inicio, new Set(), 'otro')).toBe('cerrada')
  })

  it('solo un inicio abre sesión', () => {
    const cierre = { action: 'account.signed_out', target_id: 'equipo-1' }
    expect(estadoDeSesion(cierre, abiertas, 'equipo-1')).toBeNull()
  })
})
