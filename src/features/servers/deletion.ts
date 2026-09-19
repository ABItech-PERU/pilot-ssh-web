import type { Server, ServerUser } from '@/types/api'

/** «1 credencial», «2 credenciales». */
function count(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

/** Lo que arrastra borrar un servidor. Solo cantidades, no nombres: la
 *  confirmación queda corta. */
export function describeServerLoss(server: Server): string[] {
  const perdidas: string[] = []

  if (server.users.length > 0) {
    perdidas.push(count(server.users.length, 'credencial', 'credenciales'))
  }
  if (server.links.length > 0) {
    perdidas.push(count(server.links.length, 'enlace', 'enlaces'))
  }
  if (server.total_sessions > 0) {
    perdidas.push(`${count(server.total_sessions, 'sesión', 'sesiones')} del historial`)
  }

  return perdidas
}

export function describeCredentialLoss(credential: ServerUser): string[] {
  const perdidas: string[] = []

  if (credential.links.length > 0) {
    perdidas.push(count(credential.links.length, 'enlace', 'enlaces'))
  }
  if (credential.working_directory) {
    perdidas.push('Su carpeta de trabajo')
  }
  if (credential.notes) {
    perdidas.push('Sus notas')
  }

  return perdidas
}
