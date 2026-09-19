/** Sin pestaña: el historial. */
export type PestanaCredencial = 'stats'

/** Ruta unica: lista, servidor y terminal enlazan desde aqui. */
export function buildCredentialPath(
  credentialId: string,
  pestana?: PestanaCredencial,
): string {
  const casa = `/app/credentials/${credentialId}`
  return pestana ? `${casa}/${pestana}` : casa
}
