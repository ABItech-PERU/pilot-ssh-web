/** Eco local mientras llega el del servidor.
 *
 *  Con 200 ms de ida y vuelta, la letra aparece cuando ya se tecleó la
 *  siguiente. Aquí se pinta al instante, atenuada, y se reemplaza por la del
 *  servidor en cuanto llega. Es lo que hace Mosh.
 */

export interface VistaDeTerminal {
  cols: number
  cursorX: number
  /** vim, htop y demás: ahí una letra de más descuadra la pantalla. */
  enPantallaAlterna: boolean
}

/** Solo teclas que escriben; nada de flechas, control o borrado. */
const ESCRIBE_UNA_LETRA = /^[\x20-\x7e -￿]$/u

/** Cerca del borde, el salto de línea impediría borrar lo predicho. */
const MARGEN_DERECHO = 2

/** Más allá, la persona escribe a ciegas y conviene esperar al servidor. */
const MAXIMO_PENDIENTE = 24

const ATENUADO = '\x1b[2m'
const NORMAL = '\x1b[0m'
const BORRAR_UNA = '\b \b'

export function crearEcoPredictivo() {
  let pendiente = ''
  let activo = false

  const borrarPendiente = () => {
    const borrado = BORRAR_UNA.repeat(pendiente.length)
    pendiente = ''
    return borrado
  }

  return {
    /** La latencia decide: con la respuesta rápida, adivinar no aporta. */
    activar(valor: boolean) {
      activo = valor
    },

    get hayPendiente() {
      return pendiente.length > 0
    },

    /** Lo que se pinta por la tecla, o `''` si no hay nada que adelantar. */
    predecir(datos: string, vista: VistaDeTerminal): string {
      if (!activo || vista.enPantallaAlterna) return ''
      // Cualquier otra tecla mueve el cursor o borra: lo predicho deja de valer
      if (!ESCRIBE_UNA_LETRA.test(datos)) return borrarPendiente()
      if (pendiente.length >= MAXIMO_PENDIENTE) return ''
      if (vista.cursorX >= vista.cols - MARGEN_DERECHO) return borrarPendiente()

      pendiente += datos
      return `${ATENUADO}${datos}${NORMAL}`
    },

    /** Lo que se pinta por la salida del servidor: antes borra lo predicho,
     *  que esa salida ya trae. */
    reconciliar(salida: string): string {
      return pendiente ? borrarPendiente() + salida : salida
    },

    /** Al cerrar o reconectar: la pantalla queda como la dejó el servidor. */
    limpiar(): string {
      return borrarPendiente()
    },
  }
}

export type EcoPredictivo = ReturnType<typeof crearEcoPredictivo>
