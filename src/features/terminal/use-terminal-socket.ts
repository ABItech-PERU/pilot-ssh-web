import type { Terminal } from '@xterm/xterm'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { requestSocketTicket } from '@/features/auth/api'
import { crearEcoPredictivo } from '@/features/terminal/eco-predictivo'
import * as serversApi from '@/features/servers/api'
import { avisarSubida } from '@/features/terminal/AvisoDeSubida'
import {
  type AvanceDeDescarga,
  crearDescarga,
  type DescargaEnCurso,
  VENTANA_DE_DESCARGA,
} from '@/features/terminal/descarga'
import {
  buildInitialCommand,
  buildTerminalSocketPath,
  buildTerminalUrl,
  CIERRE,
  describeClose,
  type EstadoTerminal,
  fetchEsperaDeReconexion,
  type MensajeDeArchivo,
  type MensajeDeArchivos,
  type MensajeDeCarpetas,
  type MensajeDeContenido,
  type MensajeDeSubida,
  parseIncoming,
  quotePath,
  RECONEXION,
  reconnectsAutomatically,
} from '@/features/terminal/socket'
import {
  type AvanceDeSubida,
  enviarPorTramos,
  fetchCarpetaDeLaRuta,
} from '@/features/terminal/subida'
import { descargarArchivo } from '@/lib/download'
import { env } from '@/lib/env'
import type { Server, ServerUser } from '@/types/api'

export type OrdenDeArchivo =
  | { renombrar: { ruta: string; nombre: string } }
  | { borrar: { ruta: string } }
  | { crear_carpeta: { ruta: string; nombre: string } }
  | { permisos: { ruta: string; modo: string } }

/** Por encima, la letra tarda en aparecer y conviene adelantarla. */
const LATENCIA_PARA_ADELANTAR_MS = 90

/** Se mira el mínimo de estas: el ruido del navegador solo suma tiempo. */
const MEDIDAS_A_RECORDAR = 5

/** Se avisa por tramos: al ojo no le dice nada un milisegundo arriba. */
const TRAMO_DE_LATENCIA_MS = 10

/** Cada cuánto se mide la ida y vuelta con el panel. */
const PING_CADA_MS = 2000

/** Al abrir se mide más seguido: la primera sale alta porque la terminal
 *  todavía se está montando. */
const PING_AL_ABRIR_MS = 500
const PINGS_SEGUIDOS = 4

export interface Latencias {
  /** Navegador hasta el panel. */
  red: number
  /** Panel hasta el servidor, medido al conectar. */
  salto?: number
}

/** Sin eco, la shell no repite lo tecleado: pide una contraseña. */
const SIN_ECO_MS = 600

interface Opciones {
  server: Server
  credencial: ServerUser
  /** xterm ya montado: el socket escribe en él y lee su tamaño. */
  terminal: React.RefObject<Terminal | null>
  onEstado: (estado: EstadoTerminal) => void
  onLatencia: (medidas: Latencias) => void
}

/** Ata una shell a un xterm: la abre, vuelve sola tras un corte y retoma la
 *  que quedó viva en el servidor, que reenvía lo salido sin nadie mirando. */
export function useTerminalSocket({
  server,
  credencial,
  terminal,
  onEstado,
  onLatencia,
}: Opciones) {
  const socket = useRef<WebSocket | null>(null)
  const sesion = useRef<string | null>(null)
  const reconexiones = useRef(0)
  const [intento, setIntento] = useState(0)
  const eco = useRef(crearEcoPredictivo())
  const esperaDeEco = useRef<number | undefined>(undefined)
  const pings = useRef(new Map<number, number>())
  const medidas = useRef<number[]>([])
  const latencia = useRef(0)
  const avisada = useRef(0)
  const salto = useRef<number | undefined>(undefined)
  const [subida, setSubida] = useState<AvanceDeSubida | null>(null)
  const respuesta = useRef<((suya: MensajeDeSubida) => void) | null>(null)
  const listado = useRef<((suyo: MensajeDeCarpetas) => void) | null>(null)
  const listadoDeArchivos = useRef<((suyo: MensajeDeArchivos) => void) | null>(null)
  const cambio = useRef<((suyo: MensajeDeArchivo) => void) | null>(null)
  const [descarga, setDescarga] = useState<AvanceDeDescarga | null>(null)
  const bajando = useRef<DescargaEnCurso | null>(null)
  const pidiendoDescarga = useRef(false)
  const cola = useRef<{ ruta: string; comprimir: boolean }[]>([])
  const [enCola, setEnCola] = useState(0)
  const contenido = useRef<((suyo: MensajeDeContenido) => void) | null>(null)
  const cancelada = useRef(false)
  const enCurso = useRef(false)
  const enVuelo = useRef(0)
  const turnos = useRef<(() => void)[]>([])

  // Por referencia: cambiar de aviso no reabre el socket
  const avisar = useRef(onLatencia)
  avisar.current = onLatencia

  const enviar = useCallback((carga: object) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(carga))
    }
  }, [])

  /** Lo mejor de las últimas medidas; decide también si conviene adelantar. */
  const anotarLatencia = (numero: number) => {
    const salida = pings.current.get(numero)
    if (salida === undefined) return
    pings.current.delete(numero)

    medidas.current = [...medidas.current, performance.now() - salida].slice(
      -MEDIDAS_A_RECORDAR,
    )
    latencia.current = Math.min(...medidas.current)
    eco.current.activar(latencia.current > LATENCIA_PARA_ADELANTAR_MS)

    // La primera medida cae mientras se monta la terminal: no se enseña
    if (medidas.current.length < 2) return

    const tramo =
      Math.round(latencia.current / TRAMO_DE_LATENCIA_MS) * TRAMO_DE_LATENCIA_MS
    if (tramo !== avisada.current) {
      avisada.current = tramo
      avisar.current({ red: tramo, salto: salto.current })
    }
  }

  const enviarTamano = useCallback(() => {
    const vista = terminal.current
    if (vista) enviar({ resize: { cols: vista.cols, rows: vista.rows } })
  }, [enviar, terminal])

  /** Escribe en la shell y, si la red es lenta, adelanta la letra. */
  const teclear = useCallback(
    (datos: string) => {
      const vista = terminal.current
      if (vista) {
        const adelanto = eco.current.predecir(datos, {
          cols: vista.cols,
          cursorX: vista.buffer.active.cursorX,
          enPantallaAlterna: vista.buffer.active.type === 'alternate',
        })
        if (adelanto) vista.write(adelanto)
        if (eco.current.hayPendiente && esperaDeEco.current === undefined) {
          esperaDeEco.current = window.setTimeout(() => {
            esperaDeEco.current = undefined
            vista.write(eco.current.limpiar())
            eco.current.activar(false)
          }, SIN_ECO_MS)
        }
      }
      enviar({ command: datos })
    },
    [enviar, terminal],
  )

  const esperarRespuesta = () =>
    new Promise<MensajeDeSubida>((contestar) => {
      respuesta.current = contestar
    })

  /** Carpetas de un nivel del servidor: se eligen, no se teclean. */
  const pedirCarpetas = useCallback(
    (ruta: string) =>
      new Promise<MensajeDeCarpetas>((contestar) => {
        listado.current = contestar
        enviar({ carpetas: { ruta } })
      }),
    [enviar],
  )

  /** Lo que hay en una carpeta del servidor, con tamaño, fecha y permisos. */
  const pedirArchivos = useCallback(
    (ruta: string) =>
      new Promise<MensajeDeArchivos>((contestar) => {
        listadoDeArchivos.current = contestar
        enviar({ archivos: { ruta } })
      }),
    [enviar],
  )

  /** Renombrar, borrar o crear, de uno en uno porque el servidor contesta en orden. */
  const cambiarArchivo = useCallback(
    (orden: OrdenDeArchivo) =>
      new Promise<MensajeDeArchivo>((contestar) => {
        cambio.current = contestar
        enviar(orden)
      }),
    [enviar],
  )

  /** El texto de un archivo para el editor; uno a la vez. */
  const pedirContenido = useCallback(
    (ruta: string) =>
      new Promise<MensajeDeContenido>((contestar) => {
        contenido.current = contestar
        enviar({ leer: { ruta } })
      }),
    [enviar],
  )

  /** `version` es la del texto leído: si cambió en el servidor, no se pisa. */
  const guardarContenido = useCallback(
    (orden: { ruta: string; texto: string; version: string }) =>
      new Promise<MensajeDeContenido>((contestar) => {
        contenido.current = contestar
        enviar({ guardar: orden })
      }),
    [enviar],
  )

  /** El servidor baja una a la vez; las demás esperan su turno aquí. */
  const pedirSiguienteDescarga = useCallback(() => {
    if (bajando.current || pidiendoDescarga.current) return
    const siguiente = cola.current.shift()
    setEnCola(cola.current.length)
    if (!siguiente) return
    pidiendoDescarga.current = true
    enviar({
      descarga: siguiente.comprimir
        ? { ruta: siguiente.ruta, comprimir: true }
        : { ruta: siguiente.ruta },
    })
  }, [enviar])

  /** Un archivo tal cual, o una carpeta comprimida en `.tar.gz`. */
  const descargar = useCallback(
    (ruta: string, comprimir = false) => {
      cola.current.push({ ruta, comprimir })
      setEnCola(cola.current.length)
      pedirSiguienteDescarga()
    },
    [pedirSiguienteDescarga],
  )

  const soltarDescarga = () => {
    bajando.current = null
    pidiendoDescarga.current = false
    setDescarga(null)
  }

  /** Cancela la que baja y las que esperaban: quien cancela quiere parar. */
  const cancelarDescarga = useCallback(() => {
    cola.current = []
    setEnCola(0)
    soltarDescarga()
    enviar({ descarga: { cancelar: true } })
    toast('Descarga cancelada.')
  }, [enviar])

  /** Tramos sin confirmar. Dos mantienen el canal lleno sin encolar tanto
   *  que la tecla siguiente espere. */
  const VENTANA = 2

  const pedirTurno = async () => {
    if (enVuelo.current >= VENTANA) {
      await new Promise<void>((seguir) => turnos.current.push(seguir))
    }
    enVuelo.current += 1
  }

  const darTurno = () => {
    enVuelo.current = Math.max(0, enVuelo.current - 1)
    turnos.current.shift()?.()
  }

  /** Sin turnos que esperar: un corte dejaría la copia colgada. */
  const soltarTurnos = () => {
    enVuelo.current = 0
    for (const seguir of turnos.current.splice(0)) seguir()
  }

  /** Copia un archivo a la carpeta pedida y avisa cómo terminó. */
  const subir = useCallback(
    async (archivo: File, carpeta: string) => {
      const abierto = socket.current
      if (!abierto || abierto.readyState !== WebSocket.OPEN) {
        toast.error('La terminal no está conectada.')
        return
      }
      if (enCurso.current) {
        toast('Los archivos suben de uno en uno.')
        return
      }

      enCurso.current = true
      cancelada.current = false
      soltarTurnos()
      setSubida({ nombre: archivo.name, carpeta, enviado: 0, total: archivo.size })

      try {
        enviar({ subida: { nombre: archivo.name, tamano: archivo.size, carpeta } })
        const preparada = await esperarRespuesta()
        if (preparada.estado === 'error') throw new Error(preparada.message)

        await enviarPorTramos(abierto, archivo, {
          onAvance: (enviado) =>
            setSubida({ nombre: archivo.name, carpeta, enviado, total: archivo.size }),
          sigueViva: () => !cancelada.current,
          pedirTurno,
        })
        enviar({ subida: { fin: true } })
        const guardada = await esperarRespuesta()
        if (guardada.estado === 'error') throw new Error(guardada.message)

        const ruta = guardada.ruta ?? ''
        // La del servidor, ya resuelta: la pedida puede ser `~` o relativa
        const donde = fetchCarpetaDeLaRuta(ruta)
        avisarSubida(ruta, () =>
          enviar({ command: `cd ${quotePath(donde)} && ls -l ${quotePath(ruta)}\r` }),
        )
      } catch (error) {
        const motivo = error instanceof Error ? error.message : 'No se pudo subir.'
        // Cancelar es una decisión, no un fallo
        if (cancelada.current) toast('Copia cancelada.')
        else toast.error(motivo)
      } finally {
        enCurso.current = false
        soltarTurnos()
        setSubida(null)
        // El foco vuelve de la barra o del botón: se sigue tecleando
        terminal.current?.focus()
      }
    },
    [enviar, terminal],
  )

  /** De uno en uno: el servidor solo atiende una copia por sesión. */
  const subirVarios = useCallback(
    async (archivos: File[], carpeta: string) => {
      for (const archivo of archivos) await subir(archivo, carpeta)
    },
    [subir],
  )

  /** Lo que ya se escribió en el servidor lo borra él. */
  const cancelarSubida = useCallback(() => {
    cancelada.current = true
    enviar({ subida: { cancelar: true } })
  }, [enviar])

  const reconectar = useCallback(() => {
    onEstado({ fase: 'conectando' })
    setIntento((actual) => actual + 1)
  }, [onEstado])

  const rutaInicial = credencial.working_directory

  useEffect(() => {
    let vigente = true
    let reintento: number | undefined
    let reloj: number | undefined
    let inicialPendiente = buildInitialCommand(rutaInicial)

    const escribir = (texto: string) => terminal.current?.write(texto)

    const rendirse = () =>
      onEstado({
        fase: 'cerrada',
        codigo: CIERRE.ANORMAL,
        ...describeClose(CIERRE.ANORMAL),
      })

    const programarReintento = () => {
      if (reconexiones.current >= RECONEXION.intentos) {
        rendirse()
        return
      }
      const espera = fetchEsperaDeReconexion(reconexiones.current)
      reconexiones.current += 1
      onEstado({ fase: 'conectando' })
      reintento = window.setTimeout(intentarDeNuevo, espera)
    }

    // Pasa por el interceptor, que renueva el access del vale. Si la API
    // tampoco responde, el corte sigue y se vuelve a probar
    const intentarDeNuevo = () => {
      reintento = undefined
      serversApi.fetchServer(server.id).then(
        () => {
          if (vigente) reconectar()
        },
        () => {
          if (vigente) programarReintento()
        },
      )
    }

    // Con la red de vuelta o la pestaña delante, no se espera al reloj
    const reintentarYa = () => {
      if (reintento === undefined || document.hidden) return
      window.clearTimeout(reintento)
      intentarDeNuevo()
    }
    window.addEventListener('online', reintentarYa)
    document.addEventListener('visibilitychange', reintentarYa)

    // Diferido un tick: StrictMode monta, limpia y remonta en el mismo tick;
    // un socket sincrono arrancaria y abortaria un intento SSH en el backend
    const apertura = window.setTimeout(() => {
      requestSocketTicket(buildTerminalSocketPath(server.id, credencial.id)).then(
        (vale) => {
          if (vigente) abrir(vale)
        },
        () => {
          if (vigente) programarReintento()
        },
      )
    }, 0)

    // El vale sirve una vez, así que cada apertura pide uno, también al volver
    const abrir = (vale: string) => {
      const abierto = new WebSocket(
        buildTerminalUrl(env.socketUrl, server.id, credencial.id, vale, sesion.current),
      )
      // Los tramos de una descarga llegan crudos, no como texto
      abierto.binaryType = 'arraybuffer'
      socket.current = abierto

      let numeroDePing = 0
      const medirLatencia = () => {
        if (abierto.readyState !== WebSocket.OPEN) return
        numeroDePing += 1
        pings.current.set(numeroDePing, performance.now())
        abierto.send(JSON.stringify({ ping: numeroDePing }))
      }
      const programarMedida = () => {
        const espera = numeroDePing < PINGS_SEGUIDOS ? PING_AL_ABRIR_MS : PING_CADA_MS
        reloj = window.setTimeout(() => {
          medirLatencia()
          programarMedida()
        }, espera)
      }
      programarMedida()

      abierto.onopen = () => {
        if (reconexiones.current > 0) escribir('\r\n\x1b[2m— Reconectado —\x1b[0m\r\n')
        reconexiones.current = 0
        onEstado({ fase: 'conectada' })
        terminal.current?.focus()
        enviarTamano()
        medirLatencia()
      }

      abierto.onmessage = (evento) => {
        if (evento.data instanceof ArrayBuffer) {
          const actual = bajando.current
          if (!actual) return
          actual.sumar(evento.data)
          setDescarga(actual.avance())
          enviar({ descarga: { sigue: true } })
          return
        }

        const mensaje = parseIncoming(String(evento.data))
        if (!mensaje) return
        if (mensaje.type === 'archivos') {
          const contestar = listadoDeArchivos.current
          listadoDeArchivos.current = null
          contestar?.(mensaje)
          return
        }
        if (mensaje.type === 'archivo') {
          const contestar = cambio.current
          cambio.current = null
          contestar?.(mensaje)
          return
        }
        if (mensaje.type === 'descarga') {
          if (mensaje.estado === 'preparada') {
            if (!pidiendoDescarga.current) return
            pidiendoDescarga.current = false
            const nueva = crearDescarga({
              nombre: mensaje.nombre ?? 'archivo',
              tamano: mensaje.tamano ?? null,
              ruta: mensaje.ruta ?? '',
            })
            bajando.current = nueva
            setDescarga(nueva.avance())
            for (let pedido = 0; pedido < VENTANA_DE_DESCARGA; pedido += 1) {
              enviar({ descarga: { sigue: true } })
            }
            return
          }
          const terminada = bajando.current
          soltarDescarga()
          if (mensaje.estado === 'lista' && terminada) {
            descargarArchivo(terminada.armar(), terminada.nombre)
            toast.success(`${terminada.nombre} descargado.`)
          }
          if (mensaje.estado === 'error') toast.error(mensaje.message ?? 'No se pudo descargar.')
          pedirSiguienteDescarga()
          return
        }
        if (mensaje.type === 'contenido') {
          const contestar = contenido.current
          contenido.current = null
          contestar?.(mensaje)
          return
        }
        if (mensaje.type === 'sesion') {
          sesion.current = mensaje.id
          salto.current = mensaje.saltoMs
          return
        }
        if (mensaje.type === 'subida') {
          if (mensaje.estado === 'sigue') {
            darTurno()
            return
          }
          const contestar = respuesta.current
          respuesta.current = null
          contestar?.(mensaje)
          return
        }
        if (mensaje.type === 'carpetas') {
          const contestar = listado.current
          listado.current = null
          contestar?.(mensaje)
          return
        }
        window.clearTimeout(esperaDeEco.current)
        esperaDeEco.current = undefined

        if (mensaje.type === 'pong') {
          anotarLatencia(mensaje.ping)
          return
        }

        escribir(eco.current.reconciliar(mensaje.message))

        // El cd espera a la primera salida (el prompt): en onopen la shell
        // remota aun no existe
        if (inicialPendiente && mensaje.type === 'output') {
          enviar({ command: inicialPendiente })
          inicialPendiente = null
        }
      }

      abierto.onclose = (evento) => {
        escribir(eco.current.limpiar())
        soltarTurnos()
        if (bajando.current || pidiendoDescarga.current) {
          toast.error('Se perdió la conexión durante la descarga.')
          soltarDescarga()
        }
        cola.current = []
        setEnCola(0)
        contenido.current?.({
          type: 'contenido',
          estado: 'error',
          message: 'Se perdió la conexión con la terminal.',
        })
        contenido.current = null
        // Lo que esperaba respuesta no queda colgado
        listadoDeArchivos.current?.({
          type: 'archivos',
          ruta: '',
          inicio: '',
          padre: '',
          entradas: [],
          recortada: false,
          error: 'Se perdió la conexión con la terminal.',
        })
        listadoDeArchivos.current = null
        cambio.current?.({
          type: 'archivo',
          accion: 'borrar',
          estado: 'error',
          message: 'Se perdió la conexión con la terminal.',
        })
        cambio.current = null
        const contestar = respuesta.current
        respuesta.current = null
        contestar?.({
          type: 'subida',
          estado: 'error',
          message: 'Se perdió la conexión durante la copia.',
        })
        if (reconnectsAutomatically(evento.code, reconexiones.current)) {
          if (reconexiones.current === 0) {
            escribir('\r\n\x1b[2m— Se perdió la conexión. Reconectando… —\x1b[0m\r\n')
          }
          programarReintento()
          return
        }

        const { motivo, reintentable } = describeClose(evento.code)
        escribir(`\r\n\x1b[2m— ${motivo} —\x1b[0m\r\n`)
        onEstado({ fase: 'cerrada', codigo: evento.code, motivo, reintentable })
      }
    }

    return () => {
      vigente = false
      window.removeEventListener('online', reintentarYa)
      document.removeEventListener('visibilitychange', reintentarYa)
      window.clearTimeout(apertura)
      window.clearTimeout(reintento)
      window.clearTimeout(reloj)
      window.clearTimeout(esperaDeEco.current)

      const abierto = socket.current
      socket.current = null
      if (!abierto) return

      // Manejadores fuera antes de cerrar: este cierre no cuenta como caida
      abierto.onopen = null
      abierto.onmessage = null
      abierto.onclose = null
      if (
        abierto.readyState === WebSocket.OPEN ||
        abierto.readyState === WebSocket.CONNECTING
      ) {
        // Cierre normal: la shell del servidor se cierra con él
        abierto.close(CIERRE.NORMAL)
      }
    }
  }, [
    server.id,
    credencial.id,
    rutaInicial,
    intento,
    enviar,
    enviarTamano,
    onEstado,
    reconectar,
    terminal,
  ])

  return {
    cambiarArchivo,
    cancelarDescarga,
    cancelarSubida,
    descarga,
    descargar,
    enCola,
    enviarTamano,
    guardarContenido,
    pedirContenido,
    pedirArchivos,
    pedirCarpetas,
    reconectar,
    subida,
    subirVarios,
    teclear,
  }
}
