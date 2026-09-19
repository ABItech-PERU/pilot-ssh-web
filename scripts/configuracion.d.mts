export interface Configuracion {
  ambiente: 'dev' | 'uat' | 'prd'
  apiUrl: string
  sitioUrl: string
}

export function readConfiguracion(
  variables: Record<string, string | undefined>,
): Configuracion

export function buildConfigScript(
  configuracion: Pick<Configuracion, 'ambiente' | 'apiUrl'>,
): string
