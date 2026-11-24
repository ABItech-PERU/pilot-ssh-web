import { CopyIcon, FileIcon, FolderIcon, Link2Icon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { FormDialogContent } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { describeAccesos, describeMedida, fetchOctal } from '@/features/terminal/archivos'
import type { EntradaDeArchivo, MensajeDeTarea } from '@/features/terminal/socket'
import { fetchCarpetaDeLaRuta } from '@/features/terminal/subida'
import { formatDateTime, formatFileSize } from '@/lib/format'

interface Props {
  /** El elegido, con su ruta completa; null con el diálogo cerrado. */
  entrada: (EntradaDeArchivo & { ruta: string }) | null
  medir: (ruta: string) => Promise<MensajeDeTarea>
  onCopiarRuta: (ruta: string) => void
  onCerrar: () => void
}

const TIPO = {
  carpeta: { etiqueta: 'Carpeta', icono: FolderIcon },
  archivo: { etiqueta: 'Archivo', icono: FileIcon },
  enlace: { etiqueta: 'Enlace simbólico', icono: Link2Icon },
}

const bytes = new Intl.NumberFormat('es')

type Contenido =
  { estado: 'sin-medir' | 'midiendo' } | { estado: 'medido'; texto: string }

/** Lo que el explorador de Windows llama «Propiedades». La carpeta se mide
 *  solo si se pide, porque recorrerla entera puede tardar. */
export function DialogoDeDetalles({ entrada, medir, onCopiarRuta, onCerrar }: Props) {
  // Lo último abierto sigue a la vista mientras el diálogo se cierra
  const [mostrada, setMostrada] = useState(entrada)
  const [contenido, setContenido] = useState<Contenido>({ estado: 'sin-medir' })

  useEffect(() => {
    if (!entrada) return
    setMostrada(entrada)
    setContenido({ estado: 'sin-medir' })
  }, [entrada])

  const calcular = async (ruta: string) => {
    setContenido({ estado: 'midiendo' })
    const suya = await medir(ruta)
    setContenido({
      estado: 'medido',
      texto:
        suya.estado === 'hecho'
          ? describeMedida({
              archivos: suya.archivos ?? 0,
              carpetas: suya.carpetas ?? 0,
              kb: suya.kb ?? 0,
            })
          : (suya.message ?? 'No se pudo medir.'),
    })
  }

  const tipo = mostrada ? TIPO[mostrada.tipo] : TIPO.archivo
  const Icono = tipo.icono

  return (
    <Dialog open={entrada !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-md">
              <Icono className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="leading-snug [overflow-wrap:anywhere]">
                {mostrada?.nombre}
              </DialogTitle>
              <DialogDescription>{tipo.etiqueta}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {mostrada && (
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-y-3">
            <Fila etiqueta="Ubicación">
              <span className="font-machine [overflow-wrap:anywhere]">
                {fetchCarpetaDeLaRuta(mostrada.ruta)}
              </span>
            </Fila>

            {mostrada.tipo === 'enlace' && (
              <Fila etiqueta="Apunta a">
                <span className="font-machine [overflow-wrap:anywhere]">
                  {mostrada.destino || 'No se pudo leer'}
                </span>
              </Fila>
            )}

            {mostrada.tipo === 'archivo' && (
              <Fila etiqueta="Tamaño">
                {formatFileSize(mostrada.tamano)}
                {mostrada.tamano >= 1024 && (
                  <span className="text-muted-foreground tabular-nums">
                    {' '}
                    ({bytes.format(mostrada.tamano)} bytes)
                  </span>
                )}
              </Fila>
            )}

            {mostrada.tipo === 'carpeta' && (
              <Fila etiqueta="Contenido">
                {contenido.estado === 'medido' ? (
                  contenido.texto
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="-my-1 h-7"
                    disabled={contenido.estado === 'midiendo'}
                    onClick={() => void calcular(mostrada.ruta)}
                  >
                    {contenido.estado === 'midiendo' && (
                      <Loader2Icon className="animate-spin" />
                    )}
                    {contenido.estado === 'midiendo' ? 'Calculando…' : 'Calcular'}
                  </Button>
                )}
              </Fila>
            )}

            {mostrada.modificado && (
              <Fila etiqueta="Modificado">{formatDateTime(mostrada.modificado)}</Fila>
            )}

            {mostrada.propietario && (
              <Fila etiqueta="Propietario">{mostrada.propietario}</Fila>
            )}
            {mostrada.grupo && <Fila etiqueta="Grupo">{mostrada.grupo}</Fila>}

            {/* Linux no mira los permisos del enlace, sino los de su destino */}
            {mostrada.permisos && mostrada.tipo !== 'enlace' && (
              <Fila etiqueta="Permisos">
                <span className="font-machine">
                  {mostrada.permisos}{' '}
                  <span className="text-muted-foreground">
                    ({fetchOctal(mostrada.permisos)})
                  </span>
                </span>
                <ul className="mt-1.5 space-y-0.5">
                  {describeAccesos(mostrada.permisos, mostrada.tipo).map(
                    ({ quien, puede }) => (
                      <li key={quien} className="flex gap-2">
                        <span className="text-muted-foreground w-24 shrink-0">
                          {quien}
                        </span>
                        <span>{puede}</span>
                      </li>
                    ),
                  )}
                </ul>
              </Fila>
            )}
          </dl>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => mostrada && onCopiarRuta(mostrada.ruta)}
          >
            <CopyIcon />
            Copiar ruta
          </Button>
          <Button onClick={onCerrar}>Cerrar</Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <>
      {/* En el teléfono la etiqueta va encima y el valor usa todo el ancho */}
      <dt className="text-muted-foreground pt-2 text-xs sm:pt-0 sm:text-sm">{etiqueta}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}
