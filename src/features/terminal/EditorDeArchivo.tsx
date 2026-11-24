import {
  DownloadIcon,
  FileCodeIcon,
  FileWarningIcon,
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { FormDialogContent } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { aplicarFinDeLinea, type FinDeLinea, fetchFinDeLinea } from '@/features/terminal/archivos'
import type { Cursor } from '@/features/terminal/AreaDeCodigo'
import { EsqueletoDeCodigo } from '@/features/terminal/EsqueletoDeCodigo'
import type { MensajeDeContenido } from '@/features/terminal/socket'
import { formatFileSize } from '@/lib/format'

const AreaDeCodigo = lazy(() => import('@/features/terminal/AreaDeCodigo'))

interface Props {
  /** El archivo abierto; null con el editor cerrado. */
  ruta: string | null
  pedirContenido: (ruta: string) => Promise<MensajeDeContenido>
  guardarContenido: (orden: {
    ruta: string
    texto: string
    version: string
  }) => Promise<MensajeDeContenido>
  descargar: (ruta: string) => void
  onCerrar: () => void
}

interface Abierto {
  nombre: string
  version: string
  editable: boolean
  recortado: boolean
  tamano: number
  fin: FinDeLinea
}

/** Ver y editar un archivo de texto del servidor sin salir de la terminal. */
export function EditorDeArchivo({
  ruta,
  pedirContenido,
  guardarContenido,
  descargar,
  onCerrar,
}: Props) {
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const [texto, setTexto] = useState('')
  const [guardado, setGuardado] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [lenguaje, setLenguaje] = useState<string | null>(null)
  // Cada lectura monta un editor nuevo con su texto
  const [lectura, setLectura] = useState(0)
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const partes = partirRuta(ruta ?? '')

  const cambiado = Boolean(abierto?.editable) && texto !== guardado

  const cargar = useCallback(
    async (suya: string) => {
      setCargando(true)
      setAviso(null)
      const leido = await pedirContenido(suya)
      setCargando(false)
      if (leido.estado === 'error') {
        setAbierto(null)
        setAviso(leido.message ?? 'No se pudo abrir el archivo.')
        return
      }
      const original = leido.texto ?? ''
      setAbierto({
        nombre: leido.nombre ?? suya,
        version: leido.version ?? '',
        editable: Boolean(leido.editable),
        recortado: Boolean(leido.recortado),
        tamano: leido.tamano ?? 0,
        fin: fetchFinDeLinea(original),
      })
      // El navegador une «\r\n» en «\n»; se compara con lo que va a mostrar
      const visible = original.replace(/\r\n/g, '\n')
      setTexto(visible)
      setGuardado(visible)
      setLenguaje(null)
      setLectura((previa) => previa + 1)
    },
    [pedirContenido],
  )

  useEffect(() => {
    if (ruta) void cargar(ruta)
    else {
      setAbierto(null)
      setAviso(null)
    }
  }, [ruta, cargar])

  const guardar = async () => {
    if (!ruta || !abierto || !cambiado || guardando) return
    setGuardando(true)
    const respuesta = await guardarContenido({
      ruta,
      texto: aplicarFinDeLinea(texto, abierto.fin),
      version: abierto.version,
    })
    setGuardando(false)
    if (respuesta.estado === 'error') {
      toast.error(respuesta.message ?? 'No se pudo guardar.')
      return
    }
    setGuardado(texto)
    setAbierto({
      ...abierto,
      version: respuesta.version ?? abierto.version,
      tamano: respuesta.tamano ?? abierto.tamano,
    })
    toast.success(`${abierto.nombre} guardado.`)
  }

  const pedirCierre = () => {
    if (cambiado) setDescartando(true)
    else onCerrar()
  }

  return (
    <>
      <Dialog open={ruta !== null} onOpenChange={(sigue) => !sigue && pedirCierre()}>
        <FormDialogContent
          className="flex h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
          onEscapeKeyDown={(evento) => {
            // Escape en el buscador lo cierra a él, no al archivo
            if (evento.target instanceof Element && evento.target.closest('.cm-panels')) {
              evento.preventDefault()
            }
          }}
          onKeyDown={(evento) => {
            if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
              evento.preventDefault()
              void guardar()
            }
          }}
        >
          <DialogHeader className="flex-row items-center gap-3 border-b px-5 py-3.5 text-left">
            <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-md">
              <FileCodeIcon className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="flex min-w-0 items-center gap-2.5 text-base leading-tight">
                <span className="font-machine truncate">{abierto?.nombre ?? partes.nombre}</span>
                {cambiado && (
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-xs font-normal">
                    <span className="bg-warning size-2 rounded-full" aria-hidden />
                    Sin guardar
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="flex min-w-0 items-center gap-1.5 text-xs">
                <span className="font-machine truncate" title={ruta ?? undefined}>
                  {partes.carpeta}
                </span>
                {abierto && <span className="shrink-0">· {formatFileSize(abierto.tamano)}</span>}
              </DialogDescription>
            </div>
          </DialogHeader>

          {abierto?.recortado && (
            <p className="bg-warning/10 flex items-center gap-2.5 border-b px-5 py-2 text-sm">
              <TriangleAlertIcon className="text-warning size-4 shrink-0" aria-hidden />
              <span className="flex-1">
                Es grande. Se ve solo el final, sin poder editarlo aquí.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => ruta && void cargar(ruta)}
              >
                <RefreshCwIcon />
                Ver lo último
              </Button>
            </p>
          )}

          <div className="min-h-0 flex-1">
            {cargando && <EsqueletoDeCodigo />}

            {!cargando && aviso && (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
                  <FileWarningIcon className="size-5" aria-hidden />
                </span>
                <p role="alert" className="max-w-sm text-sm">
                  {aviso}
                </p>
                {ruta && (
                  <Button variant="outline" size="sm" onClick={() => descargar(ruta)}>
                    <DownloadIcon />
                    Descargar
                  </Button>
                )}
              </div>
            )}

            {!cargando && abierto && (
              <Suspense fallback={<EsqueletoDeCodigo />}>
                <AreaDeCodigo
                  key={lectura}
                  texto={guardado}
                  nombre={abierto.nombre}
                  soloLectura={!abierto.editable}
                  soloElFinal={abierto.recortado}
                  onCambiar={setTexto}
                  onLenguaje={setLenguaje}
                  onCursor={setCursor}
                />
              </Suspense>
            )}
          </div>

          {!aviso && (
            <footer className="text-muted-foreground flex min-h-13 items-center gap-x-4 border-t px-5 py-2 text-xs">
              {abierto && (
                <>
                  {lenguaje && <span className="text-foreground font-medium">{lenguaje}</span>}
                  {cursor && !abierto.recortado && (
                    <span className="tabular-nums max-sm:hidden">
                      Lín {cursor.linea}, col {cursor.columna}
                    </span>
                  )}
                  <span>{abierto.fin === '\r\n' ? 'Windows (CRLF)' : 'Unix (LF)'}</span>
                  {!abierto.editable && (
                    <span className="rounded border px-1.5 py-0.5">Solo lectura</span>
                  )}
                  <span className="ml-auto flex items-center gap-3 max-md:hidden pointer-coarse:hidden">
                    <Atajo teclas="Ctrl F">buscar</Atajo>
                    {abierto.editable && <Atajo teclas="Ctrl S">guardar</Atajo>}
                  </span>
                </>
              )}
              {abierto?.editable && (
                <Button
                  size="sm"
                  onClick={() => void guardar()}
                  disabled={!cambiado || guardando}
                  className="ml-auto min-w-24 md:ml-0"
                >
                  {guardando ? <Loader2Icon className="animate-spin" /> : null}
                  {guardando ? 'Guardando' : 'Guardar'}
                </Button>
              )}
            </footer>
          )}
        </FormDialogContent>
      </Dialog>

      <ConfirmDialog
        open={descartando}
        onOpenChange={setDescartando}
        titulo="¿Cerrar sin guardar?"
        descripcion={`Los cambios en ${abierto?.nombre ?? 'el archivo'} se pierden.`}
        accion="Descartar cambios"
        destructiva
        onConfirmar={() => {
          setDescartando(false)
          onCerrar()
        }}
      />
    </>
  )
}

function Atajo({ teclas, children }: { teclas: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="bg-muted rounded border px-1.5 py-px font-sans text-[11px] font-medium">
        {teclas}
      </kbd>
      {children}
    </span>
  )
}

/** «/srv/app/.env» da la carpeta «/srv/app» y el nombre «.env». */
function partirRuta(ruta: string): { carpeta: string; nombre: string } {
  const corte = ruta.lastIndexOf('/')
  return { carpeta: ruta.slice(0, corte) || '/', nombre: ruta.slice(corte + 1) }
}
