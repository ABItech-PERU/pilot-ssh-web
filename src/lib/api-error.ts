import axios from 'axios'

/** Codigo de dominio del backend: que regla se disparo. El status dice
 *  que paso con la peticion; uno no sustituye al otro. */
export type ApiErrorCode =
  | 'validacion_fallida'
  | 'cuerpo_invalido'
  | 'no_autenticado'
  | 'credenciales_invalidas'
  | 'token_invalido'
  | 'cuenta_inactiva'
  | 'sin_permiso'
  | 'no_encontrado'
  | 'metodo_no_permitido'
  | 'demasiadas_peticiones'
  | 'invitacion_no_valida'
  | 'espacio_personal'
  | 'organizacion_con_servidores'
  | 'sin_conexion'
  | 'error_inesperado'

export interface ApiErrorEnvelope {
  message: string
  code: string
  errors?: Record<string, string[]>
  /** Segundos hasta poder reintentar. Solo en demasiadas_peticiones. */
  retry_after?: number | null
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fieldErrors: Record<string, string[]>
  readonly retryAfter: number | null

  constructor(envelope: ApiErrorEnvelope, status: number) {
    super(envelope.message)
    this.name = 'ApiError'
    this.code = envelope.code as ApiErrorCode
    this.status = status
    this.fieldErrors = envelope.errors ?? {}
    this.retryAfter = envelope.retry_after ?? null
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0
  }

  /** Reintentar no arregla un permiso ni una validacion. */
  get isRetryable() {
    return this.code === 'sin_conexion' || this.status >= 500
  }
}

const SIN_CONEXION =
  'No pudimos conectar. Revise la conexión a internet e inténtelo de nuevo.'
const INESPERADO = 'Algo salió mal de nuestro lado. Inténtelo en unos minutos.'

/** Normaliza cualquier fallo, red caida incluida, a ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const respuesta = error.response

    // Peticion cortada o backend apagado: no hay sobre que leer
    if (!respuesta) {
      return new ApiError({ message: SIN_CONEXION, code: 'sin_conexion' }, 0)
    }

    const cuerpo = respuesta.data as Partial<ApiErrorEnvelope> | undefined
    if (cuerpo?.message && cuerpo.code) {
      return new ApiError(cuerpo as ApiErrorEnvelope, respuesta.status)
    }

    // 502 de un proxy, HTML de una pagina de error: no pasa por el handler
    return new ApiError(
      { message: INESPERADO, code: 'error_inesperado' },
      respuesta.status,
    )
  }

  return new ApiError({ message: INESPERADO, code: 'error_inesperado' }, 0)
}
