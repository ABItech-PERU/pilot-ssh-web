export type PestanaServidor = 'credentials' | 'links' | 'access' | 'sessions' | 'stats'

/** Ruta unica: lista, ficha, terminal y Credenciales enlazan desde aqui. */
export function buildServerPath(serverId: string, pestana?: PestanaServidor): string {
  return pestana ? `/app/servers/${serverId}/${pestana}` : `/app/servers/${serverId}`
}
