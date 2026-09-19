import { describe, expect, it } from 'vitest'

import {
  decidirAccion,
  describirCobertura,
  describirLoQueAlcanza,
  etiquetaDeAccion,
  type Objetivo,
  type Sujeto,
} from '@/features/access/subject'
import type { AccessGrant, AccessGroup } from '@/types/api'

const ANA: Sujeto = {
  tipo: 'persona',
  email: 'ana@acme.pe',
  nombre: 'Ana Quispe',
  avatar: null,
}

const TODO_EL_SERVIDOR: Objetivo = { tipo: 'servidor' }
const CREDENCIALES = [{ id: 'cu1', username: 'uat-sunmetals' }]

function concesion(parcial: Partial<AccessGrant>): AccessGrant {
  return {
    id: 'c1',
    organization: 'acme',
    group: null,
    user: null,
    invitation: null,
    is_pending: false,
    subject_type: 'group',
    subject_name: 'Soporte',
    subject_email: null,
    server: null,
    server_name: null,
    server_user: null,
    label_key: '',
    label_value: '',
    scope: 'organization',
    scope_label: 'Toda la organización',
    level: 'connect',
    expires_at: null,
    is_expired: false,
    created_at: '2026-01-01T00:00:00Z',
    ...parcial,
  }
}

function grupo(parcial: Partial<AccessGroup>): AccessGroup {
  return {
    id: 'g1',
    organization: 'acme',
    name: 'Soporte',
    description: '',
    members: [],
    created_at: '2026-01-01T00:00:00Z',
    ...parcial,
  }
}

function cobertura(
  sujeto: Sujeto,
  concesiones: AccessGrant[],
  grupos: AccessGroup[] = [],
  objetivo: Objetivo = TODO_EL_SERVIDOR,
) {
  return describirCobertura({
    sujeto,
    concesiones,
    grupos,
    objetivo,
    credenciales: CREDENCIALES,
  })
}

describe('describirCobertura', () => {
  it('avisa de que ya entra por su grupo', () => {
    const grupos = [
      grupo({
        members: [
          {
            id: 'm1',
            membership: 'mm1',
            display_name: 'Ana Quispe',
            email: 'ana@acme.pe',
            avatar_url: null,
            role: 'member',
          },
        ],
      }),
    ]

    expect(cobertura(ANA, [concesion({ group: 'g1' })], grupos)).toBe(
      'Ya puede conectar aquí por el grupo «Soporte».',
    )
  })

  it('dice lo que ya puede hacer con su propio acceso', () => {
    const suya = concesion({ subject_type: 'user', subject_email: 'ana@acme.pe' })

    expect(cobertura(ANA, [suya])).toBe('Ya puede conectar aquí.')
  })

  it('no cuenta lo caducado, que ya no da acceso', () => {
    const caducada = concesion({
      subject_type: 'user',
      subject_email: 'ana@acme.pe',
      is_expired: true,
    })

    expect(cobertura(ANA, [caducada])).toBeNull()
  })

  it('a un grupo no le busca grupos', () => {
    const sujeto: Sujeto = { tipo: 'grupo', id: 'g2', nombre: 'Backend' }

    expect(cobertura(sujeto, [concesion({ group: 'g1' })])).toBeNull()
  })

  it('una credencial suelta no cuenta como el servidor entero', () => {
    const qas: Sujeto = { tipo: 'grupo', id: 'g2', nombre: 'QAs' }
    const soloUna = concesion({ group: 'g2', scope: 'credential', server_user: 'cu1' })

    expect(cobertura(qas, [soloUna])).toBe('Ya puede conectar solo con uat-sunmetals.')
  })

  it('si se comparte esa misma credencial, ya la tiene', () => {
    const qas: Sujeto = { tipo: 'grupo', id: 'g2', nombre: 'QAs' }
    const soloUna = concesion({ group: 'g2', scope: 'credential', server_user: 'cu1' })

    expect(cobertura(qas, [soloUna], [], { tipo: 'credencial', id: 'cu1' })).toBe(
      'Ya puede conectar aquí.',
    )
  })
})

describe('describirLoQueAlcanza', () => {
  it('dice que alcanza la organización entera, y con qué nivel', () => {
    const aviso = describirLoQueAlcanza('g1', [concesion({ group: 'g1' })])

    expect(aviso).toBe('Toda la organización · Conectar')
  })

  it('enumera lo concreto y cuenta lo que no cabe', () => {
    const suyas = [
      concesion({ group: 'g1', scope: 'server', scope_label: 'Web PRD' }),
      concesion({ group: 'g1', scope: 'server', scope_label: 'API PRD' }),
      concesion({ group: 'g1', scope: 'server', scope_label: 'Staging' }),
    ]

    expect(describirLoQueAlcanza('g1', suyas)).toBe('Web PRD · API PRD y 1 más')
  })

  it('lo dice cuando el grupo todavía no da nada', () => {
    expect(describirLoQueAlcanza('g1', [])).toBe('Todavía no da acceso a nada')
  })
})

describe('decidirAccion', () => {
  const qas: Sujeto = { tipo: 'grupo', id: 'g2', nombre: 'QAs' }
  const suya = concesion({ group: 'g2', scope: 'credential', server_user: 'cu1' })
  const base = {
    sujeto: qas,
    concesiones: [suya],
    objetivo: { tipo: 'credencial', id: 'cu1' } as Objetivo,
    servidor: 's1',
    caducidad: '',
  }

  it('no ofrece lo que no cambia nada', () => {
    expect(decidirAccion({ ...base, nivel: 'connect' })).toEqual({ tipo: 'nada' })
  })

  it('sobre lo mismo con otro nivel, lo cambia', () => {
    expect(decidirAccion({ ...base, nivel: 'manage' })).toEqual({
      tipo: 'cambiar-nivel',
      nivel: 'manage',
    })
  })

  it('quitar la caducidad también es un cambio', () => {
    const conFecha = concesion({ ...suya, expires_at: '2026-12-31T23:59:59Z' })

    expect(decidirAccion({ ...base, concesiones: [conFecha], nivel: 'connect' })).toEqual(
      { tipo: 'quitar-caducidad' },
    )
  })

  it('sobre el servidor entero es otra concesión', () => {
    expect(
      decidirAccion({ ...base, objetivo: TODO_EL_SERVIDOR, nivel: 'connect' }),
    ).toEqual({
      tipo: 'dar',
    })
  })

  it('el botón dice el cambio', () => {
    expect(etiquetaDeAccion({ tipo: 'cambiar-nivel', nivel: 'manage' })).toBe(
      'Cambiar a Gestionar',
    )
  })
})
