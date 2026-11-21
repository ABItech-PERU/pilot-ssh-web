export interface Configuracion {
  ambiente: 'local' | 'uat' | 'prod'
  apiUrl: string
  sitioUrl: string
}

export function readConfiguracion(
  variables: Record<string, string | undefined>,
): Configuracion

export function buildConfigScript(
  configuracion: Pick<Configuracion, 'ambiente' | 'apiUrl'>,
): string
