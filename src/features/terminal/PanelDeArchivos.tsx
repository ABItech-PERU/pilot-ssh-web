import { cn } from 'cn'
import {
  ChevronRightIcon,
  CopyIcon,
  CornerLeftUpIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileIcon,
  FolderIcon,
  FolderPlusIcon,
  HouseIcon,
  Link2Icon,
  Loader2Icon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SquareTerminalIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { LineaEsqueleto } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  describeBorrado,
  fetchMigas,
  filtrarEntradas,
  joinRuta,
} from '@/features/terminal/archivos'
import type {
  EntradaDeArchivo,
  MensajeDeArchivo,
  MensajeDeArchivos,
} from '@/features/terminal/socket'
import type { OrdenDeArchivo } from '@/features/terminal/use-terminal-socket'
import { formatDateTime, formatFileSize } from '@/lib/format'

interface Props {
  /** Donde arranca; normalmente donde está la shell. */
  carpetaInicial: string
  pedirArchivos: (ruta: string) => Promise<MensajeDeArchivos>
  cambiarArchivo: (orden: OrdenDeArchivo) => Promise<MensajeDeArchivo>
  descargar: (ruta: string) => void
  subir: (archivos: File[], carpeta: string) => Promise<void>
  /** Lleva la shell a esa carpeta con un `cd`. */
  abrirEnTerminal: (ruta: string) => void
  onCerrar: () => void
}

const ICONO_DEL_TIPO = { carpeta: FolderIcon, archivo: FileIcon, enlace: Link2Icon }

/** Los archivos del servidor junto a la terminal, por su misma conexión. */
export function PanelDeArchivos({
  carpetaInicial,
  pedirArchivos,
  cambiarArchivo,
  descargar,
  subir,
  abrirEnTerminal,
  onCerrar,
}: Props) {
  const [listado, setListado] = useState<MensajeDeArchivos | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [renombrando, setRenombrando] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [porBorrar, setPorBorrar] = useState<EntradaDeArchivo | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const selector = useRef<HTMLInputElement | null>(null)
  // Estable: si cambiara en cada render, robaría el foco a la búsqueda
  const enfocarAlAbrir = useCallback((nodo: HTMLElement | null) => {
    nodo?.focus({ preventScroll: true })
  }, [])

  const navegar = useCallback(
    async (ruta: string) => {
      setCargando(true)
      setAviso(null)
      setRenombrando(null)
      setCreando(false)
      setBusqueda('')
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

  const subirAqui = (archivos: File[]) => {
    if (archivos.length) void subir(archivos, aqui).then(recargar)
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

  const borrar = async () => {
    if (!porBorrar) return
    const ruta = joinRuta(aqui, porBorrar.nombre)
    // Se cierra también si falla, porque repetirlo daría el mismo motivo
    await cambiar({ borrar: { ruta } }, `${porBorrar.nombre} borrado.`)
    setPorBorrar(null)
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
  const visibles = filtrarEntradas(entradas, busqueda)
  const borrado = porBorrar ? describeBorrado(porBorrar.tipo) : null

  return (
    <aside
      // El foco entra al abrir, así Escape cierra sin hacer clic antes
      ref={enfocarAlAbrir}
      tabIndex={-1}
      id="panel-de-archivos"
      aria-label="Archivos del servidor"
      className="border-term-border bg-term-bg text-term-text absolute inset-2 z-20 flex flex-col rounded-md border shadow-lg outline-none sm:left-auto sm:w-96"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && !renombrando && !creando && !porBorrar) onCerrar()
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
        subirAqui([...evento.dataTransfer.files])
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

      <nav
        aria-label="Ruta"
        className="border-term-border flex flex-wrap items-center gap-0.5 border-b px-2 py-1 text-xs"
      >
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
      </nav>

      <label className="border-term-border flex items-center gap-2 border-b px-3 py-1.5">
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
            {listado.padre && !busqueda && (
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
                      onAbrir={() => void navegar(ruta)}
                      onDescargar={() => descargar(ruta)}
                      onAbrirEnTerminal={() => abrirEnTerminal(ruta)}
                      onCopiarRuta={() => void copiarRuta(ruta)}
                      onRenombrar={() => setRenombrando(entrada.nombre)}
                      onBorrar={() => setPorBorrar(entrada)}
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
          <p className="text-term-dim p-4 text-sm">Nada se llama así en esta carpeta.</p>
        )}

        {listado?.recortada && !cargando && (
          <p className="text-term-dim p-3 text-xs">
            Se muestran las primeras 300. Para el resto, use la terminal.
          </p>
        )}
      </div>

      <p className="border-term-border text-term-dim hidden border-t px-3 py-2 text-xs sm:block">
        Suelte archivos aquí para subirlos a esta carpeta.
      </p>

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
          subirAqui([...(evento.target.files ?? [])])
          // Elegir otra vez el mismo archivo también cuenta como cambio
          evento.target.value = ''
        }}
      />

      <ConfirmDialog
        open={Boolean(porBorrar)}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
        titulo={`¿Borrar ${porBorrar?.nombre ?? ''}?`}
        descripcion={porBorrar ? joinRuta(aqui, porBorrar.nombre) : ''}
        detalles={borrado?.detalles}
        accion={borrado?.accion ?? 'Borrar'}
        destructiva
        pendiente={cambiando}
        onConfirmar={() => void borrar()}
      />
    </aside>
  )
}

function FilaDeEntrada({
  entrada,
  onAbrir,
  onDescargar,
  onAbrirEnTerminal,
  onCopiarRuta,
  onRenombrar,
  onBorrar,
}: {
  entrada: EntradaDeArchivo
  onAbrir: () => void
  onDescargar: () => void
  onAbrirEnTerminal: () => void
  onCopiarRuta: () => void
  onRenombrar: () => void
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

  const contenido = (
    <>
      <Icono
        className={cn('size-4 shrink-0', esArchivo ? 'text-term-dim' : 'text-term-arg')}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="font-machine block truncate text-sm">{entrada.nombre}</span>
        <span className="text-term-dim block truncate text-xs">
          {detalle}
          {entrada.permisos && (
            <span className="font-machine hidden sm:inline">
              {detalle ? ' · ' : ''}
              {entrada.permisos}
            </span>
          )}
        </span>
      </span>
    </>
  )

  return (
    <div className="flex items-center gap-0.5 pr-1.5 hover:bg-white/5">
      {esArchivo ? (
        // Un archivo no se abre. Su botón a la vista es descargarlo
        <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3">{contenido}</div>
      ) : (
        <button
          type="button"
          onClick={onAbrir}
          title={entrada.tipo === 'enlace' ? 'Abrir a donde apunta' : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 text-left"
        >
          {contenido}
        </button>
      )}

      {esArchivo && (
        <BotonDelPanel etiqueta={`Descargar ${entrada.nombre}`} onClick={onDescargar}>
          <DownloadIcon className="size-4" />
        </BotonDelPanel>
      )}

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
            <DropdownMenuItem onSelect={onDescargar}>
              <DownloadIcon />
              Descargar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={onAbrirEnTerminal}>
              <SquareTerminalIcon />
              Abrir en la terminal
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onCopiarRuta}>
            <CopyIcon />
            Copiar ruta
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRenombrar}>
            <PencilIcon />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onBorrar}>
            <Trash2Icon />
            Borrar…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
