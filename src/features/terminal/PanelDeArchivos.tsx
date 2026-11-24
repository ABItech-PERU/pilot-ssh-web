import { cn } from 'cn'
import {
  CheckSquareIcon,
  ChevronRightIcon,
  CopyIcon,
  CornerLeftUpIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileArchiveIcon,
  FileIcon,
  FilePenLineIcon,
  FolderIcon,
  FolderPlusIcon,
  FolderUpIcon,
  HouseIcon,
  KeyRoundIcon,
  Link2Icon,
  Loader2Icon,
  PackageOpenIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SquareTerminalIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { LineaEsqueleto } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type CriterioDeOrden,
  describeBorrado,
  describeMedida,
  esComprimido,
  fetchMigas,
  filtrarEntradas,
  joinRuta,
  type Medida,
  ordenarEntradas,
  pideEscribirElNombre,
  quitarOcultos,
  type Sentido,
} from '@/features/terminal/archivos'
import { abrirDescarga } from '@/features/terminal/descarga'
import { DialogoDePermisos } from '@/features/terminal/DialogoDePermisos'
import { EditorDeArchivo } from '@/features/terminal/EditorDeArchivo'
import type {
  AccionDeTarea,
  EntradaDeArchivo,
  MensajeDeArchivo,
  MensajeDeArchivos,
  MensajeDeContenido,
  MensajeDeTarea,
} from '@/features/terminal/socket'
import { leerElegidos, leerSoltados, type Soltado } from '@/features/terminal/soltar'
import { type ArchivoParaSubir, planearSubida } from '@/features/terminal/transferencias'
import type { OrdenDeArchivo } from '@/features/terminal/use-terminal-socket'
import {
  guardarVista,
  leerVista,
  type VistaDeArchivos,
} from '@/features/terminal/vista-de-archivos'
import { formatDateTime, formatFileSize } from '@/lib/format'

interface Props {
  /** Donde arranca; normalmente donde está la shell. */
  carpetaInicial: string
  pedirArchivos: (ruta: string) => Promise<MensajeDeArchivos>
  cambiarArchivo: (orden: OrdenDeArchivo) => Promise<MensajeDeArchivo>
  pedirContenido: (ruta: string) => Promise<MensajeDeContenido>
  guardarContenido: (orden: {
    ruta: string
    texto: string
    version: string
  }) => Promise<MensajeDeContenido>
  descargar: (ruta: string) => void
  /** Medir, comprimir, extraer o borrar en grande, aparte de la shell. */
  ejecutarTarea: (
    accion: AccionDeTarea,
    ruta: string,
    nombres?: string[],
  ) => Promise<MensajeDeTarea>
  /** Pone en cola; resuelve cuando la cola termina, para recargar la lista. */
  subir: (archivos: ArchivoParaSubir[]) => Promise<void>
  /** Lleva la shell a esa carpeta con un `cd`. */
  abrirEnTerminal: (ruta: string) => void
  onCerrar: () => void
}

const ICONO_DEL_TIPO = { carpeta: FolderIcon, archivo: FileIcon, enlace: Link2Icon }

const ORDENES: { valor: CriterioDeOrden; etiqueta: string }[] = [
  { valor: 'nombre', etiqueta: 'Nombre' },
  { valor: 'tamano', etiqueta: 'Tamaño' },
  { valor: 'fecha', etiqueta: 'Fecha de cambio' },
]

/** Los archivos del servidor junto a la terminal, por su misma conexión. */
export function PanelDeArchivos({
  carpetaInicial,
  pedirArchivos,
  cambiarArchivo,
  pedirContenido,
  guardarContenido,
  descargar,
  ejecutarTarea,
  subir,
  abrirEnTerminal,
  onCerrar,
}: Props) {
  const [listado, setListado] = useState<MensajeDeArchivos | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<VistaDeArchivos>(leerVista)
  const [escribiendoRuta, setEscribiendoRuta] = useState(false)
  const [renombrando, setRenombrando] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [eligiendo, setEligiendo] = useState(false)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [porBorrar, setPorBorrar] = useState<EntradaDeArchivo[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [conPermisos, setConPermisos] = useState<EntradaDeArchivo | null>(null)
  const [cambiando, setCambiando] = useState(false)
  // Lo que tienen las carpetas por borrar; mientras no sea de esta lista, se mide
  const [medida, setMedida] = useState<{ de: EntradaDeArchivo[]; total: Medida | null }>({
    de: [],
    total: null,
  })
  const [enCurso, setEnCurso] = useState<{ id: number; texto: string }[]>([])
  const siguienteTarea = useRef(0)
  const [arrastrando, setArrastrando] = useState(false)
  const selector = useRef<HTMLInputElement | null>(null)
  const selectorDeCarpeta = useRef<HTMLInputElement | null>(null)
  // Estable: si cambiara en cada render, robaría el foco a la búsqueda
  const enfocarAlAbrir = useCallback((nodo: HTMLElement | null) => {
    nodo?.focus({ preventScroll: true })
  }, [])

  useEffect(() => guardarVista(vista), [vista])

  const navegar = useCallback(
    async (ruta: string) => {
      setCargando(true)
      setAviso(null)
      setRenombrando(null)
      setCreando(false)
      setEscribiendoRuta(false)
      setBusqueda('')
      setElegidos(new Set())
      const suyo = await pedirArchivos(ruta)
      if (suyo.error) setAviso(suyo.error)
      else setListado(suyo)
      setCargando(false)
    },
    [pedirArchivos],
  )

  useEffect(() => {
    void navegar(carpetaInicial)
  }, [carpetaInicial, navegar])

  const aqui = listado?.ruta ?? carpetaInicial
  const recargar = useCallback(async () => {
    const suyo = await pedirArchivos(aqui)
    if (suyo.error) setAviso(suyo.error)
    else setListado(suyo)
  }, [aqui, pedirArchivos])

  const subirAqui = (soltados: Soltado[]) => {
    if (soltados.length) void subir(planearSubida(aqui, soltados)).then(recargar)
  }

  const cambiar = async (orden: OrdenDeArchivo, exito: string) => {
    setCambiando(true)
    const respuesta = await cambiarArchivo(orden)
    setCambiando(false)
    if (respuesta.estado === 'error') {
      toast.error(respuesta.message ?? 'El servidor no hizo el cambio.')
      return false
    }
    toast.success(exito)
    await recargar()
    return true
  }

  const renombrar = async (entrada: EntradaDeArchivo, nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio || limpio === entrada.nombre) {
      setRenombrando(null)
      return
    }
    const ruta = joinRuta(aqui, entrada.nombre)
    if (await cambiar({ renombrar: { ruta, nombre: limpio } }, `Ahora se llama ${limpio}.`)) {
      setRenombrando(null)
    }
  }

  const crearCarpeta = async (nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio) {
      setCreando(false)
      return
    }
    if (
      await cambiar({ crear_carpeta: { ruta: aqui, nombre: limpio } }, `Carpeta ${limpio} creada.`)
    ) {
      setCreando(false)
    }
  }

  /** Se ve abajo mientras corre, y la lista se recarga al terminar. */
  const enSegundoPlano = async (
    texto: string,
    accion: AccionDeTarea,
    ruta: string,
    nombres?: string[],
  ) => {
    siguienteTarea.current += 1
    const id = siguienteTarea.current
    setEnCurso((antes) => [...antes, { id, texto }])
    const suya = await (nombres
      ? ejecutarTarea(accion, ruta, nombres)
      : ejecutarTarea(accion, ruta))
    setEnCurso((antes) => antes.filter((una) => una.id !== id))
    return suya
  }

  const comprimir = async (entrada: EntradaDeArchivo) => {
    const ruta = joinRuta(aqui, entrada.nombre)
    const suya = await enSegundoPlano(`Comprimiendo ${entrada.nombre}…`, 'comprimir', ruta)
    if (suya.estado === 'error') {
      toast.error(suya.message ?? `No se pudo comprimir ${entrada.nombre}.`)
      return
    }
    toast.success(`${suya.nombre ?? 'El comprimido'} está listo.`, {
      description: 'Ya está en la lista para descargarlo.',
    })
    await recargar()
  }

  const extraer = async (entrada: EntradaDeArchivo) => {
    const ruta = joinRuta(aqui, entrada.nombre)
    const suya = await enSegundoPlano(`Extrayendo ${entrada.nombre}…`, 'extraer', ruta)
    if (suya.estado === 'error') {
      toast.error(suya.message ?? `No se pudo extraer ${entrada.nombre}.`)
      return
    }
    toast.success(`${entrada.nombre} extraído en la carpeta ${suya.nombre ?? ''}.`)
    await recargar()
  }

  // Al pedir borrar carpetas, se mide qué tienen antes de dejar confirmar
  useEffect(() => {
    const carpetas = porBorrar.filter((entrada) => entrada.tipo === 'carpeta')
    if (!carpetas.length) return
    let vigente = true
    void Promise.all(
      carpetas.map((carpeta) => ejecutarTarea('medir', joinRuta(aqui, carpeta.nombre))),
    ).then((medidas) => {
      if (!vigente) return
      const total = medidas.every((una) => una.estado === 'hecho')
        ? medidas.reduce<Medida>(
            (suma, una) => ({
              archivos: suma.archivos + (una.archivos ?? 0),
              carpetas: suma.carpetas + (una.carpetas ?? 0),
              kb: suma.kb + (una.kb ?? 0),
            }),
            { archivos: 0, carpetas: 0, kb: 0 },
          )
        : null
      setMedida({ de: porBorrar, total })
    })
    return () => {
      vigente = false
    }
  }, [porBorrar, aqui, ejecutarTarea])

  /** De uno en uno y con un solo aviso al final, diga lo que diga cada uno.
   *  Una carpeta se borra entera en el servidor; lo demás, por SFTP. */
  const borrar = async () => {
    const lista = porBorrar
    setCambiando(true)
    let borrados = 0
    let motivo = ''
    for (const entrada of lista) {
      const ruta = joinRuta(aqui, entrada.nombre)
      const respuesta =
        entrada.tipo === 'carpeta'
          ? await ejecutarTarea('borrar', ruta)
          : await cambiarArchivo({ borrar: { ruta } })
      if (respuesta.estado === 'hecho') borrados += 1
      else motivo ||= respuesta.message ?? ''
    }
    setCambiando(false)
    setPorBorrar([])
    setElegidos(new Set())
    setEligiendo(false)
    if (borrados === lista.length) {
      toast.success(lista.length === 1 ? `${lista[0]?.nombre} borrado.` : `${borrados} borrados.`)
    } else {
      toast.error(
        lista.length === 1 ? motivo : `Se borraron ${borrados} de ${lista.length}. ${motivo}`,
      )
    }
    await recargar()
  }

  const cambiarPermisos = async (ruta: string, modo: string) => {
    if (await cambiar({ permisos: { ruta, modo } }, 'Permisos cambiados.')) setConPermisos(null)
  }

  const copiarRuta = async (ruta: string) => {
    try {
      await navigator.clipboard.writeText(ruta)
      toast.success('Ruta copiada.')
    } catch {
      toast.error('El navegador no dejó copiar. Selecciónela en la ruta de arriba.')
    }
  }

  const entradas = listado?.entradas ?? []
  const sinOcultos = quitarOcultos(entradas)
  const visibles = ordenarEntradas(
    filtrarEntradas(vista.ocultos ? entradas : sinOcultos, busqueda),
    vista.orden,
    vista.sentido,
  )
  const ocultas = vista.ocultos ? 0 : entradas.length - sinOcultos.length
  const deLaSeleccion = visibles.filter((entrada) => elegidos.has(entrada.nombre))
  const todosElegidos = visibles.length > 0 && deLaSeleccion.length === visibles.length

  const alternar = (nombre: string) =>
    setElegidos((antes) => {
      const despues = new Set(antes)
      if (despues.has(nombre)) despues.delete(nombre)
      else despues.add(nombre)
      return despues
    })

  const salirDeLaSeleccion = () => {
    setEligiendo(false)
    setElegidos(new Set())
  }

  /** Un archivo baja tal cual; varios, o una carpeta, en un solo .tar.gz. */
  const descargarElegidos = async () => {
    const elegidos = deLaSeleccion
    salirDeLaSeleccion()
    const [unico] = elegidos
    if (elegidos.length === 1 && unico && unico.tipo !== 'carpeta') {
      descargar(joinRuta(aqui, unico.nombre))
      return
    }
    const que = elegidos.length === 1 ? unico?.nombre : `${elegidos.length} elementos`
    const suya = await enSegundoPlano(
      `Preparando la descarga de ${que}…`,
      'empaquetar',
      aqui,
      elegidos.map((entrada) => entrada.nombre),
    )
    if (suya.estado !== 'hecho' || !suya.url) {
      toast.error(suya.message ?? 'No se pudo preparar la descarga.')
      return
    }
    abrirDescarga(suya.url)
    toast.info(`Descargando ${suya.nombre ?? 'la selección'}`, {
      description: 'Sigue mientras la terminal esté abierta.',
    })
  }

  const medicion: Medicion =
    medida.de === porBorrar
      ? { midiendo: false, total: medida.total }
      : { midiendo: porBorrar.some((entrada) => entrada.tipo === 'carpeta'), total: null }
  const borrado = describirLoQueSeBorra(porBorrar, medicion)

  return (
    <aside
      // El foco entra al abrir, así Escape cierra sin hacer clic antes
      ref={enfocarAlAbrir}
      tabIndex={-1}
      aria-label="Archivos del servidor"
      className="border-term-border bg-term-bg text-term-text absolute inset-2 z-20 flex flex-col rounded-md border shadow-lg outline-none sm:left-auto sm:w-[26rem]"
      onKeyDown={(evento) => {
        if (evento.key !== 'Escape' || renombrando || creando || escribiendoRuta) return
        // Los diálogos viven en un portal, pero React les sube el teclado hasta
        // aquí. Su Escape es suyo, o el panel cerraría el editor sin preguntar
        const deUnDialogo = !evento.currentTarget.contains(evento.target as Node)
        if (deUnDialogo || editando || conPermisos || porBorrar.length) return
        if (eligiendo) salirDeLaSeleccion()
        else onCerrar()
      }}
      onDragOver={(evento) => {
        evento.preventDefault()
        evento.stopPropagation()
        setArrastrando(true)
      }}
      onDragLeave={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
          setArrastrando(false)
        }
      }}
      onDrop={(evento) => {
        evento.preventDefault()
        // Que la terminal de detrás no lo suba también a su carpeta
        evento.stopPropagation()
        setArrastrando(false)
        void leerSoltados(evento.dataTransfer).then(subirAqui)
      }}
    >
      <header className="border-term-border flex items-center gap-0.5 border-b py-1.5 pr-1.5 pl-3">
        <h2 className="flex-1 text-sm font-medium">Archivos</h2>
        <BotonDelPanel etiqueta="Nueva carpeta" onClick={() => setCreando(true)}>
          <FolderPlusIcon className="size-4" />
        </BotonDelPanel>
        <BotonDelPanel etiqueta="Subir aquí" onClick={() => selector.current?.click()}>
          <UploadIcon className="size-4" />
        </BotonDelPanel>
        <BotonDelPanel
          etiqueta="Subir una carpeta"
          onClick={() => selectorDeCarpeta.current?.click()}
        >
          <FolderUpIcon className="size-4" />
        </BotonDelPanel>
        <BotonDelPanel
          etiqueta="Abrir esta carpeta en la terminal"
          onClick={() => abrirEnTerminal(aqui)}
        >
          <SquareTerminalIcon className="size-4" />
        </BotonDelPanel>
        <BotonDelPanel etiqueta="Actualizar la lista" onClick={() => void navegar(aqui)}>
          <RefreshCwIcon className={cn('size-4', cargando && 'animate-spin')} />
        </BotonDelPanel>
        <BotonDelPanel etiqueta="Cerrar los archivos" onClick={onCerrar}>
          <XIcon className="size-4" />
        </BotonDelPanel>
      </header>

      {escribiendoRuta ? (
        <CampoDeRuta
          actual={aqui}
          onIr={(ruta) => void navegar(ruta)}
          onCancelar={() => setEscribiendoRuta(false)}
        />
      ) : (
        <nav
          aria-label="Ruta"
          className="border-term-border flex items-center gap-0.5 border-b px-2 py-1 text-xs"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="text-term-dim hover:text-term-text h-7 px-2 hover:bg-white/5"
              onClick={() => void navegar('~')}
            >
              <HouseIcon />
              Inicio
            </Button>
            {fetchMigas(aqui).map((miga, posicion, migas) => (
              <span key={miga.ruta} className="flex items-center gap-0.5">
                <ChevronRightIcon className="text-term-dim size-3" aria-hidden />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-current={posicion === migas.length - 1 ? 'location' : undefined}
                  className={cn(
                    'font-machine hover:text-term-text h-7 px-1.5 hover:bg-white/5',
                    posicion === migas.length - 1 ? 'text-term-text' : 'text-term-dim',
                  )}
                  onClick={() => void navegar(miga.ruta)}
                >
                  {miga.nombre}
                </Button>
              </span>
            ))}
          </div>
          <BotonDelPanel etiqueta="Escribir una ruta" onClick={() => setEscribiendoRuta(true)}>
            <PencilIcon className="size-3.5" />
          </BotonDelPanel>
        </nav>
      )}

      <div className="border-term-border flex items-center gap-1 border-b py-1 pr-1.5 pl-3">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <SearchIcon className="text-term-dim size-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Buscar en esta carpeta</span>
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar en esta carpeta"
            className="placeholder:text-term-dim min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
          />
        </label>
        <MenuDeVista vista={vista} onCambiar={setVista} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Elegir varios"
          title="Elegir varios"
          aria-pressed={eligiendo}
          onClick={() => (eligiendo ? salirDeLaSeleccion() : setEligiendo(true))}
          className={cn(
            'hover:text-term-text size-8 shrink-0 hover:bg-white/5',
            eligiendo ? 'text-term-text bg-white/10' : 'text-term-dim',
          )}
        >
          <CheckSquareIcon className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={cargando}>
        {cargando && !listado && (
          <div className="space-y-3 p-3" aria-hidden>
            <LineaEsqueleto className="w-2/3 bg-white/10" />
            <LineaEsqueleto className="w-1/2 bg-white/10" />
            <LineaEsqueleto className="w-3/5 bg-white/10" />
          </div>
        )}

        {!cargando && aviso && (
          <div className="space-y-2 p-3 text-sm">
            <p role="alert">{aviso}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-term-border bg-transparent hover:bg-white/5"
              onClick={() => void navegar('~')}
            >
              <HouseIcon />
              Volver al inicio
            </Button>
          </div>
        )}

        {listado && !aviso && (
          <ul className={cn('divide-term-border divide-y', cargando && 'opacity-60')}>
            {eligiendo && visibles.length > 0 && (
              <li className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <Checkbox
                  aria-label="Elegir todos"
                  checked={todosElegidos}
                  onCheckedChange={(valor) =>
                    setElegidos(
                      valor === true ? new Set(visibles.map((e) => e.nombre)) : new Set(),
                    )
                  }
                  className="border-term-dim"
                />
                <span className="text-term-dim">
                  {deLaSeleccion.length
                    ? `${deLaSeleccion.length} de ${visibles.length} elegidos`
                    : 'Elegir todos'}
                </span>
              </li>
            )}
            {creando && (
              <li>
                <CampoDeNombre
                  etiqueta="Nombre de la carpeta nueva"
                  inicial=""
                  accion="Crear"
                  pendiente={cambiando}
                  onGuardar={(nombre) => void crearCarpeta(nombre)}
                  onCancelar={() => setCreando(false)}
                />
              </li>
            )}
            {listado.padre && !busqueda && !eligiendo && (
              <li>
                <button
                  type="button"
                  onClick={() => void navegar(listado.padre)}
                  className="text-term-dim hover:text-term-text flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  <CornerLeftUpIcon className="size-4 shrink-0" aria-hidden />
                  Carpeta superior
                </button>
              </li>
            )}
            {visibles.map((entrada) => {
              const ruta = joinRuta(aqui, entrada.nombre)
              return (
                <li key={entrada.nombre}>
                  {renombrando === entrada.nombre ? (
                    <CampoDeNombre
                      etiqueta={`Nombre nuevo de ${entrada.nombre}`}
                      inicial={entrada.nombre}
                      accion="Guardar"
                      pendiente={cambiando}
                      onGuardar={(nombre) => void renombrar(entrada, nombre)}
                      onCancelar={() => setRenombrando(null)}
                    />
                  ) : (
                    <FilaDeEntrada
                      entrada={entrada}
                      eligiendo={eligiendo}
                      elegida={elegidos.has(entrada.nombre)}
                      onElegir={() => alternar(entrada.nombre)}
                      onAbrir={() =>
                        entrada.tipo === 'archivo' ? setEditando(ruta) : void navegar(ruta)
                      }
                      onDescargar={() => descargar(ruta)}
                      onComprimir={() => void comprimir(entrada)}
                      onExtraer={
                        esComprimido(entrada.nombre) && entrada.tipo === 'archivo'
                          ? () => void extraer(entrada)
                          : undefined
                      }
                      onAbrirEnTerminal={() => abrirEnTerminal(ruta)}
                      onCopiarRuta={() => void copiarRuta(ruta)}
                      onRenombrar={() => setRenombrando(entrada.nombre)}
                      onPermisos={() => setConPermisos(entrada)}
                      onBorrar={() => setPorBorrar([entrada])}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {listado && !aviso && !cargando && entradas.length === 0 && !creando && (
          <div className="text-term-dim space-y-3 p-4 text-sm">
            <p>Esta carpeta está vacía.</p>
            <Button
              size="sm"
              variant="outline"
              className="border-term-border text-term-text bg-transparent hover:bg-white/5"
              onClick={() => selector.current?.click()}
            >
              <UploadIcon />
              Subir aquí
            </Button>
          </div>
        )}

        {listado && entradas.length > 0 && visibles.length === 0 && (
          <p className="text-term-dim p-4 text-sm">
            {busqueda ? 'Nada se llama así en esta carpeta.' : 'Solo hay archivos ocultos.'}
          </p>
        )}

        {listado && !cargando && (listado.recortada || ocultas > 0) && (
          <p className="text-term-dim space-x-1 p-3 text-xs">
            {listado.recortada && <span>Se muestran las primeras 300.</span>}
            {ocultas > 0 && (
              <button
                type="button"
                className="hover:text-term-text underline underline-offset-2"
                onClick={() => setVista({ ...vista, ocultos: true })}
              >
                {ocultas === 1 ? 'Mostrar 1 archivo oculto' : `Mostrar ${ocultas} ocultos`}
              </button>
            )}
          </p>
        )}
      </div>

      {enCurso.length > 0 && (
        <div
          role="status"
          className="border-term-border text-term-dim space-y-1 border-t px-3 py-2 text-xs"
        >
          {enCurso.map((tarea) => (
            <p key={tarea.id} className="flex items-center gap-2">
              <Loader2Icon className="size-3.5 shrink-0 animate-spin" aria-hidden />
              <span className="truncate">{tarea.texto}</span>
            </p>
          ))}
        </div>
      )}

      {eligiendo ? (
        <div className="border-term-border flex items-center gap-1.5 border-t px-3 py-2">
          <span className="text-term-dim mr-auto text-xs">
            {deLaSeleccion.length === 1 ? '1 elegido' : `${deLaSeleccion.length} elegidos`}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!deLaSeleccion.length}
            onClick={() => void descargarElegidos()}
            className="border-term-border text-term-text h-7 bg-transparent hover:bg-white/5"
          >
            <DownloadIcon />
            Descargar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!deLaSeleccion.length}
            onClick={() => setPorBorrar(deLaSeleccion)}
            className="border-term-border text-term-root hover:text-term-root h-7 bg-transparent hover:bg-white/5"
          >
            <Trash2Icon />
            Borrar
          </Button>
        </div>
      ) : (
        <p className="border-term-border text-term-dim hidden border-t px-3 py-2 text-xs sm:block">
          Suelte archivos aquí para subirlos a esta carpeta.
        </p>
      )}

      {arrastrando && (
        <div className="bg-term-bg/90 absolute inset-0 grid place-items-center rounded-md border border-dashed border-white/25">
          <p className="px-4 text-center text-sm">
            Suelte para subir a <span className="font-machine">{aqui}</span>
          </p>
        </div>
      )}

      <input
        ref={selector}
        type="file"
        multiple
        className="hidden"
        onChange={(evento) => {
          subirAqui(leerElegidos([...(evento.target.files ?? [])]))
          // Elegir otra vez el mismo archivo también cuenta como cambio
          evento.target.value = ''
        }}
      />

      <input
        ref={selectorDeCarpeta}
        type="file"
        // Elige una carpeta entera; cada archivo trae su ruta dentro de ella
        {...{ webkitdirectory: '' }}
        className="hidden"
        onChange={(evento) => {
          subirAqui(leerElegidos([...(evento.target.files ?? [])]))
          evento.target.value = ''
        }}
      />

      <ConfirmDialog
        open={porBorrar.length > 0}
        onOpenChange={(abierto) => !abierto && setPorBorrar([])}
        titulo={borrado.titulo}
        descripcion={borrado.descripcion}
        detalles={borrado.detalles}
        accion={borrado.accion}
        confirmacion={borrado.confirmacion}
        destructiva
        pendiente={cambiando || medicion.midiendo}
        onConfirmar={() => void borrar()}
      />

      <EditorDeArchivo
        ruta={editando}
        pedirContenido={pedirContenido}
        guardarContenido={guardarContenido}
        descargar={descargar}
        onCerrar={() => {
          setEditando(null)
          void recargar()
        }}
      />

      <DialogoDePermisos
        entrada={
          conPermisos ? { ...conPermisos, ruta: joinRuta(aqui, conPermisos.nombre) } : null
        }
        pendiente={cambiando}
        onGuardar={(ruta, modo) => void cambiarPermisos(ruta, modo)}
        onCerrar={() => setConPermisos(null)}
      />
    </aside>
  )
}

interface Medicion {
  midiendo: boolean
  total: Medida | null
}

/** Lo que tienen dentro las carpetas, o por qué todavía no se sabe. */
function describirContenido({ midiendo, total }: Medicion): string {
  if (midiendo) return 'Midiendo lo que tiene dentro…'
  return total ? describeMedida(total) : 'No se pudo medir lo que tiene dentro.'
}

/** Uno se nombra; varios se cuentan, como pide la regla de bajas. Con muchos
 *  archivos dentro, o sin poder medirlos, hay que escribir para confirmar. */
function describirLoQueSeBorra(lista: EntradaDeArchivo[], medicion: Medicion) {
  const [unico] = lista
  const carpetas = lista.filter((entrada) => entrada.tipo === 'carpeta').length
  const pideEscribir = carpetas > 0 && !medicion.midiendo && pideEscribirElNombre(medicion.total)
  if (lista.length === 1 && unico) {
    const { accion, detalles } = describeBorrado(unico.tipo)
    return {
      titulo: `¿Borrar ${unico.nombre}?`,
      descripcion: carpetas ? describirContenido(medicion) : unico.nombre,
      accion,
      detalles,
      confirmacion: pideEscribir ? unico.nombre : undefined,
    }
  }
  const detalles = ['Se borran del servidor. No hay papelera para recuperarlos.']
  if (carpetas) {
    const contenido = describirContenido(medicion)
    detalles.push(`Las carpetas se borran con todo lo que tienen. ${contenido}`)
  }
  return {
    titulo: `¿Borrar ${lista.length} elementos?`,
    descripcion: 'Se borran uno por uno. Si alguno falla, el aviso dice por qué.',
    accion: `Borrar ${lista.length}`,
    detalles,
    confirmacion: pideEscribir ? 'borrar' : undefined,
  }
}

function MenuDeVista({
  vista,
  onCambiar,
}: {
  vista: VistaDeArchivos
  onCambiar: (vista: VistaDeArchivos) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ordenar y filtrar"
          title="Ordenar y filtrar"
          className="text-term-dim hover:text-term-text size-8 shrink-0 hover:bg-white/5"
        >
          <SlidersHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={vista.orden}
          onValueChange={(orden) => onCambiar({ ...vista, orden: orden as CriterioDeOrden })}
        >
          {ORDENES.map((orden) => (
            <DropdownMenuRadioItem key={orden.valor} value={orden.valor}>
              {orden.etiqueta}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={vista.sentido}
          onValueChange={(sentido) => onCambiar({ ...vista, sentido: sentido as Sentido })}
        >
          <DropdownMenuRadioItem value="asc">
            {vista.orden === 'nombre' ? 'De la A a la Z' : 'De menor a mayor'}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">
            {vista.orden === 'nombre' ? 'De la Z a la A' : 'De mayor a menor'}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={vista.ocultos}
          onCheckedChange={(ocultos) => onCambiar({ ...vista, ocultos: ocultos === true })}
        >
          Mostrar ocultos
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilaDeEntrada({
  entrada,
  eligiendo,
  elegida,
  onElegir,
  onAbrir,
  onDescargar,
  onComprimir,
  onExtraer,
  onAbrirEnTerminal,
  onCopiarRuta,
  onRenombrar,
  onPermisos,
  onBorrar,
}: {
  entrada: EntradaDeArchivo
  eligiendo: boolean
  elegida: boolean
  onElegir: () => void
  onAbrir: () => void
  onDescargar: () => void
  onComprimir: () => void
  /** Solo en los comprimidos que el servidor sabe abrir. */
  onExtraer?: () => void
  onAbrirEnTerminal: () => void
  onCopiarRuta: () => void
  onRenombrar: () => void
  onPermisos: () => void
  onBorrar: () => void
}) {
  const Icono = ICONO_DEL_TIPO[entrada.tipo]
  const esArchivo = entrada.tipo === 'archivo'
  const detalle = [
    esArchivo ? formatFileSize(entrada.tamano) : null,
    entrada.modificado ? formatDateTime(entrada.modificado) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const pista = esArchivo
    ? 'Abrir para ver o editar'
    : entrada.tipo === 'enlace'
      ? 'Abrir a donde apunta'
      : undefined
  // El nombre accesible es solo el del archivo; tamaño y fecha lo describen
  const idDelDetalle = useId()
  const descripcion = [detalle, entrada.permisos].filter(Boolean).join(' · ')

  return (
    <div
      className={cn('flex items-center gap-0.5 pr-1.5 hover:bg-white/5', elegida && 'bg-white/5')}
    >
      {eligiendo && (
        <Checkbox
          aria-label={`Elegir ${entrada.nombre}`}
          checked={elegida}
          onCheckedChange={onElegir}
          className="border-term-dim ml-3"
        />
      )}
      <button
        type="button"
        onClick={eligiendo ? onElegir : onAbrir}
        title={eligiendo ? undefined : pista}
        aria-label={entrada.nombre}
        aria-describedby={idDelDetalle}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 text-left"
      >
        <Icono
          className={cn('size-4 shrink-0', esArchivo ? 'text-term-dim' : 'text-term-arg')}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="font-machine block truncate text-sm">{entrada.nombre}</span>
          <span id={idDelDetalle} className="sr-only">
            {descripcion}
          </span>
          <span aria-hidden className="text-term-dim block truncate text-xs">
            {detalle}
            {entrada.permisos && (
              <span className="font-machine hidden sm:inline">
                {detalle ? ' · ' : ''}
                {entrada.permisos}
              </span>
            )}
          </span>
        </span>
      </button>

      {esArchivo && !eligiendo && (
        <BotonDelPanel etiqueta={`Descargar ${entrada.nombre}`} onClick={onDescargar}>
          <DownloadIcon className="size-4" />
        </BotonDelPanel>
      )}

      {!eligiendo && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Más acciones de ${entrada.nombre}`}
              className="text-term-dim hover:text-term-text size-8 shrink-0 hover:bg-white/10"
            >
              <EllipsisVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {esArchivo ? (
              <>
                <DropdownMenuItem onSelect={onAbrir}>
                  <FilePenLineIcon />
                  Ver o editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDescargar}>
                  <DownloadIcon />
                  Descargar
                </DropdownMenuItem>
                {onExtraer && (
                  <DropdownMenuItem onSelect={onExtraer}>
                    <PackageOpenIcon />
                    Extraer aquí
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem onSelect={onAbrirEnTerminal}>
                <SquareTerminalIcon />
                Abrir en la terminal
              </DropdownMenuItem>
            )}
            {entrada.tipo !== 'enlace' && (
              <DropdownMenuItem onSelect={onComprimir}>
                <FileArchiveIcon />
                Comprimir
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onCopiarRuta}>
              <CopyIcon />
              Copiar ruta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRenombrar}>
              <PencilIcon />
              Renombrar
            </DropdownMenuItem>
            {entrada.tipo !== 'enlace' && (
              <DropdownMenuItem onSelect={onPermisos}>
                <KeyRoundIcon />
                Permisos…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onSelect={onBorrar}>
              <Trash2Icon />
              Borrar…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/** Teclear la ruta de una vez, como en la barra de un explorador. */
function CampoDeRuta({
  actual,
  onIr,
  onCancelar,
}: {
  actual: string
  onIr: (ruta: string) => void
  onCancelar: () => void
}) {
  const [ruta, setRuta] = useState(actual)
  return (
    <form
      className="border-term-border flex items-center gap-1.5 border-b px-2 py-1.5"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (ruta.trim()) onIr(ruta.trim())
      }}
    >
      <input
        aria-label="Ruta a la que ir"
        className="font-machine border-term-border min-w-0 flex-1 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-white/40"
        value={ruta}
        autoFocus
        onFocus={(evento) => evento.currentTarget.select()}
        onChange={(evento) => setRuta(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.stopPropagation()
            onCancelar()
          }
        }}
        placeholder="/var/www o ~/sitio"
      />
      <Button type="submit" size="sm" className="bg-term-ok text-term-bg hover:bg-term-ok/90 h-7">
        Ir
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onCancelar}
        className="border-term-border h-7 bg-transparent hover:bg-white/5"
      >
        Cancelar
      </Button>
    </form>
  )
}

/** Escribir un nombre en la misma fila, para crear una carpeta o renombrar. */
function CampoDeNombre({
  etiqueta,
  inicial,
  accion,
  pendiente,
  onGuardar,
  onCancelar,
}: {
  etiqueta: string
  inicial: string
  accion: string
  pendiente: boolean
  onGuardar: (nombre: string) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(inicial)
  return (
    <form
      className="flex items-center gap-1.5 px-2 py-1.5"
      onSubmit={(evento) => {
        evento.preventDefault()
        onGuardar(nombre)
      }}
    >
      <input
        aria-label={etiqueta}
        className="font-machine border-term-border min-w-0 flex-1 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-white/40"
        value={nombre}
        disabled={pendiente}
        autoFocus
        onFocus={(evento) => {
          // Selecciona el nombre sin la extensión, que casi nunca cambia
          const punto = inicial.lastIndexOf('.')
          evento.currentTarget.setSelectionRange(0, punto > 0 ? punto : inicial.length)
        }}
        onChange={(evento) => setNombre(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.stopPropagation()
            onCancelar()
          }
        }}
      />
      <Button
        type="submit"
        size="sm"
        disabled={pendiente}
        className="bg-term-ok text-term-bg hover:bg-term-ok/90 h-7 min-w-16"
      >
        {pendiente ? <Loader2Icon className="animate-spin" /> : accion}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pendiente}
        onClick={onCancelar}
        className="border-term-border h-7 bg-transparent hover:bg-white/5"
      >
        Cancelar
      </Button>
    </form>
  )
}

function BotonDelPanel({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className="text-term-dim hover:text-term-text size-8 shrink-0 hover:bg-white/5"
    >
      {children}
    </Button>
  )
}
