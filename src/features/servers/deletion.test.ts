import { describe, expect, it } from 'vitest'

import { describeCredentialLoss, describeServerLoss } from '@/features/servers/deletion'
import type { Server, ServerUser } from '@/types/api'

function credencial(extra: Partial<ServerUser> = {}): ServerUser {
  return {
    id: 'c1',
    server: 's1',
    server_name: 'Web',
    server_ip: '10.0.0.1',
    username: 'deploy',
    auth_type: 'password',
    has_password: true,
    has_private_key: false,
    working_directory: '',
    links: [],
    labels: {},
    notes: '',
    last_used_at: null,
    total_sessions: 0,
    people_count: 0,
    average_session_time: 'N/A',
    created_by_name: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    access_level: 'manage',
    ...extra,
  }
}

function servidor(extra: Partial<Server> = {}): Server {
  return {
    id: 's1',
    organization: 'o1',
    organization_name: 'Acme',
    organization_slug: 'acme',
    name: 'Web',
    ip: '10.0.0.1',
    port: 22,
    links: [],
    labels: {},
    created_at: '2026-01-01T00:00:00Z',
    created_by_name: null,
    users: [],
    last_used_at: null,
    total_sessions: 0,
    average_session_time: 'N/A',
    has_host_key: false,
    access_level: 'manage',
    ...extra,
  }
}

describe('describeServerLoss', () => {
  it('un servidor recien creado no arrastra nada: la lista va vacia', () => {
    expect(describeServerLoss(servidor())).toEqual([])
  })

  it('cuenta lo que se lleva, sin nombrarlo uno por uno', () => {
    const perdidas = describeServerLoss(
      servidor({
        users: [
          credencial({ username: 'root' }),
          credencial({ id: 'c2', username: 'deploy' }),
        ],
        links: [{ label: 'CloudPanel', url: 'https://panel', kind: 'panel' }],
        total_sessions: 5,
      }),
    )

    expect(perdidas).toEqual(['2 credenciales', '1 enlace', '5 sesiones del historial'])
  })

  it('singular cuando es una sola sesion', () => {
    expect(describeServerLoss(servidor({ total_sessions: 1 }))).toEqual([
      '1 sesión del historial',
    ])
  })
})

describe('describeCredentialLoss', () => {
  it('sin enlaces, carpeta ni notas no hay nada que avisar', () => {
    expect(describeCredentialLoss(credencial())).toEqual([])
  })

  it('cuenta los enlaces y avisa de la carpeta y las notas', () => {
    expect(
      describeCredentialLoss(
        credencial({
          links: [
            { label: 'Tienda', url: 'https://tienda', kind: 'web' },
            { label: 'Base de datos', url: 'https://pma', kind: 'database' },
          ],
          working_directory: '/home/deploy/htdocs',
          notes: 'algo',
        }),
      ),
    ).toEqual(['2 enlaces', 'Su carpeta de trabajo', 'Sus notas'])
  })
})
