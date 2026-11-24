import type { Terminal } from '@xterm/xterm'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { requestSocketTicket } from '@/features/auth/api'
import { crearEcoPredictivo } from '@/features/terminal/eco-predictivo'
import * as serversApi from '@/features/servers/api'
import type {
  Conflicto,
  DecisionDeConflicto,
} from '@/features/terminal/DialogoDeConflicto'
import { abrirDescarga } from '@/features/terminal/descarga'
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
  type MensajeDeContenido,
  type MensajeDeDescarga,
  type MensajeDeTarea,
  type AccionDeTarea,
  type MensajeDeSubida,
  parseIncoming,
  RECONEXION,
  reconnectsAutomatically,
} from '@/features/terminal/socket'
import { enviarPorTramos, fetchCarpetaDeLaRuta } from '@/features/terminal/subida'
import {
  type ArchivoParaSubir,
  calcularVelocidad,
  type Muestra,
  type Transferencia,
} from '@/features/terminal/transferencias'
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

const SIN_CONEXION = 'Se perdió la conexión con la terminal.'

/** Muestras recientes para medir la velocidad de una subida. */
const MUESTRAS_DE_VELOCIDAD = 60

const sinListado = (): MensajeDeArchivos => ({
  type: 'archivos',
  ruta: '',
  inicio: '',
  padre: '',
  entradas: [],
  recortada: false,
  error: SIN_CONEXION,
})

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
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  // Copia síncrona, para que la cola lea lo último sin esperar al render
  const lista = useRef<Transferencia[]>([])
  const fijarLista = (cambio: (antes: Transferencia[]) => Transferencia[]) => {
    lista.current = cambio(lista.current)
    setTransferencias(lista.current)
  }
  const siguienteId = useRef(0)
  const trabajando = useRef(false)
  const actual = useRef<number | null>(null)
  const politica = useRef<DecisionDeConflicto | null>(null)
  const alVaciar = useRef<(() => void)[]>([])
  const reanudarCola = useRef<() => void>(() => {})
  const [conflicto, setConflicto] = useState<Conflicto | null>(null)
  const alDecidir = useRef<
    ((suya: { decision: DecisionDeConflicto; aTodos: boolean }) => void) | null
  >(null)
  const respuesta = useRef<((suya: MensajeDeSubida) => void) | null>(null)
  // En cola, porque puede haber dos pedidos vivos y el servidor contesta en orden
  const listadosDeArchivos = useRef<((suyo: MensajeDeArchivos) => void)[]>([])
  const cambio = useRef<((suyo: MensajeDeArchivo) => void) | null>(null)
  const preparada = useRef<((suya: MensajeDeDescarga) => void) | null>(null)
  // Por acción y ruta, porque varias corren a la vez y acaban en cualquier orden
  const tareas = useRef(new Map<string, ((suya: MensajeDeTarea) => void)[]>())
  const turnoDeDescarga = useRef<Promise<void>>(Promise.resolve())
  const contenido = useRef<((suyo: MensajeDeContenido) => void) | null>(null)
  const cancelada = useRef(false)
  const enVuelo = useRef(0)
  const turnos = useRef<(() => void)[]>([])

  // Por referencia: cambiar de aviso no reabre el socket
  const avisar = useRef(onLatencia)
  avisar.current = onLatencia

  /** Falso si no salió, porque con la conexión caída nadie contestará. */
  const enviar = useCallback((carga: object) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false
    socket.current.send(JSON.stringify(carga))
    return true
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

  /** Lo que hay en una carpeta del servidor, con tamaño, fecha y permisos. */
  const pedirArchivos = useCallback(
    (ruta: string) =>
      new Promise<MensajeDeArchivos>((contestar) => {
        if (enviar({ archivos: { ruta } })) listadosDeArchivos.current.push(contestar)
        else contestar(sinListado())
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

  const pedirEnlace = useCallback(
    (ruta: string) =>
      new Promise<MensajeDeDescarga>((contestar) => {
        preparada.current = contestar
        if (!enviar({ descarga: { ruta } })) {
          preparada.current = null
          contestar({ type: 'descarga', estado: 'error', message: SIN_CONEXION })
        }
      }),
    [enviar],
  )

  /** El servidor prepara el enlace y el navegador lo baja con su gestor,
   *  directo al disco. Se piden de a uno porque el servidor contesta en orden. */
  const descargar = useCallback(
    (ruta: string) => {
      turnoDeDescarga.current = turnoDeDescarga.current.then(async () => {
        const suya = await pedirEnlace(ruta)
        if (suya.estado !== 'preparada' || !suya.url) {
          toast.error(suya.message ?? 'No se pudo descargar.')
          return
        }
        abrirDescarga(suya.url)
        toast.info(`Descargando ${suya.nombre ?? 'el archivo'}`, {
          description: 'Sigue mientras la terminal esté abierta.',
        })
      })
    },
    [pedirEnlace],
  )

  /** Medir, comprimir, extraer o borrar en grande. Corre en el servidor
   *  aparte de la shell y contesta al terminar. */
  const ejecutarTarea = useCallback(
    (accion: AccionDeTarea, ruta: string, nombres?: string[]) =>
      new Promise<MensajeDeTarea>((contestar) => {
        if (!enviar({ tarea: { accion, ruta, ...(nombres ? { nombres } : {}) } })) {
          contestar({ type: 'tarea', accion, pedida: ruta, estado: 'error', message: SIN_CONEXION })
          return
        }
        const clave = JSON.stringify([accion, ruta])
        tareas.current.set(clave, [...(tareas.current.get(clave) ?? []), contestar])
      }),
    [enviar],
  )

  /** Tramos sin confirmar. Con seis, la latencia no frena la copia. */
  const VENTANA = 6

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

  /** El servidor atiende una subida por sesión, así que van en cola. */
  const actualizar = (id: number, cambios: Partial<Transferencia>) =>
    fijarLista((antes) =>
      antes.map((una) => (una.id === id ? { ...una, ...cambios } : una)),
    )

  const anunciar = (una: Transferencia, siExiste: DecisionDeConflicto | null) => {
    enviar({
      subida: {
        nombre: una.archivo.name,
        tamano: una.total,
        carpeta: una.carpeta,
        crear_carpeta: una.crearCarpeta,
        ...(siExiste ? { si_existe: siExiste } : {}),
      },
    })
    return esperarRespuesta()
  }

  const preguntar = (pendiente: Conflicto) =>
    new Promise<{ decision: DecisionDeConflicto; aTodos: boolean }>((contestar) => {
      alDecidir.current = contestar
      setConflicto(pendiente)
    })

  const decidirConflicto = useCallback(
    (decision: DecisionDeConflicto, aTodos: boolean) => {
      setConflicto(null)
      alDecidir.current?.({ decision, aTodos })
      alDecidir.current = null
    },
    [],
  )

  /** Una de la cola, de principio a fin; su estado dice cómo terminó. */
  const subirUna = async (una: Transferencia, abierto: WebSocket) => {
    actual.current = una.id
    cancelada.current = false
    soltarTurnos()
    actualizar(una.id, {
      estado: 'subiendo',
      enviado: 0,
      velocidad: null,
      motivo: undefined,
    })
    const muestras: Muestra[] = [{ instante: performance.now(), enviado: 0 }]

    try {
      let preparada = await anunciar(una, politica.current)
      if (preparada.estado === 'existe') {
        const quedan = lista.current.filter((otra) => otra.estado === 'en-cola').length
        const { decision, aTodos } = politica.current
          ? { decision: politica.current, aTodos: true }
          : await preguntar({
              nombre: una.archivo.name,
              carpeta: fetchCarpetaDeLaRuta(preparada.ruta ?? ''),
              quedan,
            })
        if (aTodos) politica.current = decision
        if (cancelada.current) throw new Error('Se canceló la copia.')
        if (decision === 'omitir') {
          actualizar(una.id, { estado: 'omitida' })
          return
        }
        preparada = await anunciar(una, decision)
      }
      if (preparada.estado !== 'preparada') throw new Error(preparada.message)

      await enviarPorTramos(abierto, una.archivo, {
        onAvance: (enviado) => {
          muestras.push({ instante: performance.now(), enviado })
          if (muestras.length > MUESTRAS_DE_VELOCIDAD) muestras.shift()
          actualizar(una.id, { enviado, velocidad: calcularVelocidad(muestras) })
        },
        sigueViva: () => !cancelada.current,
        pedirTurno,
      })
      enviar({ subida: { fin: true } })
      const guardada = await esperarRespuesta()
      if (guardada.estado !== 'guardada') throw new Error(guardada.message)
      actualizar(una.id, { estado: 'lista', enviado: una.total, ruta: guardada.ruta })
    } catch (error) {
      if (cancelada.current) {
        actualizar(una.id, { estado: 'cancelada' })
      } else {
        const motivo = error instanceof Error ? error.message : 'No se pudo subir.'
        actualizar(una.id, { estado: 'error', motivo })
      }
    } finally {
      actual.current = null
      soltarTurnos()
    }
  }

  /** Sube lo que espera, de a uno. Sin conexión se detiene y sigue al volver. */
  const procesarCola = async () => {
    if (trabajando.current) return
    trabajando.current = true
    try {
      for (;;) {
        const abierto = socket.current
        if (!abierto || abierto.readyState !== WebSocket.OPEN) return
        const siguiente = lista.current.find((una) => una.estado === 'en-cola')
        if (!siguiente) break
        await subirUna(siguiente, abierto)
      }
      politica.current = null
      for (const listo of alVaciar.current.splice(0)) listo()
    } finally {
      trabajando.current = false
      // El foco vuelve a la terminal para seguir tecleando
      terminal.current?.focus()
    }
  }
  reanudarCola.current = () => void procesarCola()

  /** Pone en cola y resuelve cuando la cola se vacía, para recargar la lista. */
  const encolarSubidas = useCallback(
    (archivos: ArchivoParaSubir[]) => {
      if (!archivos.length) return Promise.resolve()
      const nuevas = archivos.map<Transferencia>((uno) => {
        siguienteId.current += 1
        return {
          id: siguienteId.current,
          archivo: uno.archivo,
          nombre: uno.nombre,
          carpeta: uno.carpeta,
          crearCarpeta: uno.crearCarpeta,
          estado: 'en-cola',
          enviado: 0,
          total: uno.archivo.size,
          velocidad: null,
        }
      })
      fijarLista((antes) => [...antes, ...nuevas])
      const vacia = new Promise<void>((listo) => alVaciar.current.push(listo))
      reanudarCola.current()
      return vacia
    },
    [],
  )

  /** La que sube se corta en el servidor, que borra lo escrito; las demás
   *  salen de la cola. */
  const cancelarTransferencia = useCallback(
    (id: number) => {
      if (actual.current === id) {
        cancelada.current = true
        enviar({ subida: { cancelar: true } })
        if (alDecidir.current) decidirConflicto('omitir', false)
        return
      }
      actualizar(id, { estado: 'cancelada' })
    },
    [enviar, decidirConflicto],
  )

  const cancelarTodas = useCallback(() => {
    fijarLista((antes) =>
      antes.map((una) =>
        una.estado === 'en-cola' ? { ...una, estado: 'cancelada' } : una,
      ),
    )
    if (actual.current !== null) cancelarTransferencia(actual.current)
  }, [cancelarTransferencia])

  const reintentarTransferencia = useCallback((id: number) => {
    actualizar(id, { estado: 'en-cola', enviado: 0, velocidad: null, motivo: undefined })
    reanudarCola.current()
  }, [])

  const limpiarTransferencias = useCallback(() => {
    fijarLista((antes) =>
      antes.filter((una) => una.estado === 'en-cola' || una.estado === 'subiendo'),
    )
  }, [])

  const hayEnCurso = transferencias.some(
    (una) => una.estado === 'en-cola' || una.estado === 'subiendo',
  )

  // Cerrar la pestaña corta la copia; el navegador pregunta antes
  useEffect(() => {
    if (!hayEnCurso) return
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayEnCurso])

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
        reanudarCola.current()
      }

      abierto.onmessage = (evento) => {
        const mensaje = parseIncoming(String(evento.data))
        if (!mensaje) return
        if (mensaje.type === 'archivos') {
          listadosDeArchivos.current.shift()?.(mensaje)
          return
        }
        if (mensaje.type === 'archivo') {
          const contestar = cambio.current
          cambio.current = null
          contestar?.(mensaje)
          return
        }
        if (mensaje.type === 'tarea') {
          const clave = JSON.stringify([mensaje.accion, mensaje.pedida])
          const esperando = tareas.current.get(clave) ?? []
          esperando.shift()?.(mensaje)
          if (!esperando.length) tareas.current.delete(clave)
          return
        }
        if (mensaje.type === 'descarga') {
          if (mensaje.estado === 'cortada') {
            toast.error(mensaje.message ?? 'La descarga se cortó.')
            return
          }
          const contestar = preparada.current
          preparada.current = null
          contestar?.(mensaje)
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
        preparada.current?.({ type: 'descarga', estado: 'error', message: SIN_CONEXION })
        for (const [clave, esperando] of tareas.current) {
          const [accion, pedida] = JSON.parse(clave) as [AccionDeTarea, string]
          for (const contestar of esperando) {
            contestar({ type: 'tarea', accion, pedida, estado: 'error', message: SIN_CONEXION })
          }
        }
        tareas.current.clear()
        preparada.current = null
        contenido.current?.({
          type: 'contenido',
          estado: 'error',
          message: 'Se perdió la conexión con la terminal.',
        })
        contenido.current = null
        // Lo que esperaba respuesta no queda colgado
        for (const contestar of listadosDeArchivos.current.splice(0)) contestar(sinListado())
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
    cancelarTodas,
    cancelarTransferencia,
    conflicto,
    decidirConflicto,
    descargar,
    encolarSubidas,
    ejecutarTarea,
    enviarTamano,
    guardarContenido,
    pedirContenido,
    pedirArchivos,
    limpiarTransferencias,
    reconectar,
    reintentarTransferencia,
    teclear,
    transferencias,
  }
}
