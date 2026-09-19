/** Destino al cambiar de organización.
 *
 *  Listas: se quedan; cambian con la clave de consulta.
 *  Ficha de servidor o credencial: a la lista de su sección; el recurso es
 *  de la organización anterior.
 *  Ajustes de la cuenta: a Servidores; son de la persona y no cambiarían. */
export function resolveLandingAfterSwitch(pathname: string): string {
  if (pathname.startsWith('/app/settings')) return '/app/servers'
  const ficha = pathname.match(/^\/app\/(servers|credentials)\/[^/]+/)
  return ficha ? `/app/${ficha[1]}` : pathname
}
