import { DownloadIcon, Loader2Icon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { FormDialogContent } from '@/components/form-dialog'
import { LineaEsqueleto } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { aplicarFinDeLinea, type FinDeLinea, fetchFinDeLinea } from '@/features/terminal/archivos'
import type { MensajeDeContenido } from '@/features/terminal/socket'
import { formatFileSize } from '@/lib/format'

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
  const area = useRef<HTMLTextAreaElement | null>(null)

  const cambiado = Boolean(abierto?.editable) && texto !== guardado

  // De un log importa lo último: se abre por el final, como `tail`
  useEffect(() => {
    if (!cargando && abierto?.recortado && area.current) {
      area.current.scrollTop = area.current.scrollHeight
    }
  }, [cargando, abierto])

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
          className="flex h-[calc(100dvh-2rem)] flex-col gap-3 overflow-hidden sm:max-w-5xl"
          onKeyDown={(evento) => {
            if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
              evento.preventDefault()
              void guardar()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-machine truncate">
              {abierto?.nombre ?? 'Abriendo…'}
              {cambiado && (
                <span className="text-muted-foreground ml-2 font-sans text-sm font-normal">
                  Sin guardar
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="font-machine truncate">
              {ruta}
              {abierto && ` · ${formatFileSize(abierto.tamano)}`}
            </DialogDescription>
          </DialogHeader>

          {abierto?.recortado && (
            <p className="bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm">
              <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
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
            {cargando && (
              <div className="space-y-3 p-2" aria-hidden>
                <LineaEsqueleto className="w-2/3" />
                <LineaEsqueleto className="w-1/2" />
                <LineaEsqueleto className="w-3/4" />
              </div>
            )}

            {!cargando && aviso && (
              <div className="space-y-3 p-2 text-sm">
                <p role="alert">{aviso}</p>
                {ruta && (
                  <Button variant="outline" size="sm" onClick={() => descargar(ruta)}>
                    <DownloadIcon />
                    Descargar
                  </Button>
                )}
              </div>
            )}

            {!cargando && abierto && (
              <textarea
                ref={(nodo) => {
                  area.current = nodo
                }}
                aria-label={`Contenido de ${abierto.nombre}`}
                className="font-machine bg-muted/40 focus-visible:ring-ring h-full w-full resize-none rounded-md border p-3 text-[13px] leading-5 outline-none focus-visible:ring-2"
                value={texto}
                readOnly={!abierto.editable}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                onChange={(evento) => setTexto(evento.target.value)}
              />
            )}
          </div>

          {abierto && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground mr-auto text-xs">
                {abierto.editable
                  ? `${abierto.fin === '\r\n' ? 'Fin de línea de Windows (CRLF)' : 'Fin de línea Unix (LF)'} · Ctrl+S guarda`
                  : 'Solo lectura'}
              </span>
              {abierto.editable && (
                <Button
                  onClick={() => void guardar()}
                  disabled={!cambiado || guardando}
                  className="min-w-28"
                >
                  {guardando ? <Loader2Icon className="animate-spin" /> : null}
                  {guardando ? 'Guardando' : 'Guardar'}
                </Button>
              )}
            </div>
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
