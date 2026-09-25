/** Eco local mientras llega el del servidor.
 *
 *  Con 200 ms de ida y vuelta, la letra aparece cuando ya se tecleó la
 *  siguiente. Aquí se pinta al instante, igual que la pintará el servidor;
 *  cuando su eco confirma lo mismo, no se repinta. Es lo que hace Mosh.
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
      // Sin distintivo: marcarla delata la espera que se quiere disimular
      return datos
    },

    /** Lo que se pinta por la salida del servidor. Si confirma lo adelantado,
     *  no se repinta: borrar y volver a escribir lo mismo se ve parpadear. */
    reconciliar(salida: string): string {
      if (!pendiente) return salida

      if (pendiente.startsWith(salida)) {
        pendiente = pendiente.slice(salida.length)
        return ''
      }

      if (salida.startsWith(pendiente)) {
        const resto = salida.slice(pendiente.length)
        pendiente = ''
        return resto
      }

      // La shell escribió otra cosa: manda ella
      return borrarPendiente() + salida
    },

    /** Al cerrar o reconectar: la pantalla queda como la dejó el servidor. */
    limpiar(): string {
      return borrarPendiente()
    },
  }
}

export type EcoPredictivo = ReturnType<typeof crearEcoPredictivo>
