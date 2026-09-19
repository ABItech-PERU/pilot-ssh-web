import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react'

import { FormDialogContent } from '@/components/form-dialog'
import { ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type Comprobante,
  nombreDelComprobante,
  tipoDeComprobante,
} from '@/features/credits/comprobantes'
import { useComprobante } from '@/features/credits/use-comprobante'
import { descargarArchivo } from '@/lib/download'

interface Props {
  comprobante: Comprobante
  /** Para el nombre del archivo descargado. */
  paquete: string
  operacion: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Imagen o PDF del comprobante en pantalla, con descarga bajo un nombre
 *  descriptivo. */
export function ReceiptViewer({
  comprobante,
  paquete,
  operacion,
  open,
  onOpenChange,
}: Props) {
  const { archivo, url, error, reintentar } = useComprobante(comprobante, open)
  const tipo = tipoDeComprobante(comprobante.formato)
  const nombre = nombreDelComprobante(comprobante.formato, { paquete, operacion })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comprobante</DialogTitle>
          <DialogDescription>
            {paquete}
            {operacion && ` · operación ${operacion}`}
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorState error={error} onRetry={reintentar} />}

        {!error && !url && <Skeleton className="h-[40vh] w-full rounded-lg" />}

        {url && tipo === 'imagen' && (
          <img
            src={url}
            alt={`Comprobante de ${paquete}`}
            className="bg-muted mx-auto max-h-[60vh] w-auto rounded-lg border object-contain"
          />
        )}

        {/* Se comprueba antes de pintar: mejor pedir abrirlo fuera que un
            marco en blanco. En teléfono no se incrusta: no cabe */}
        {url &&
          tipo === 'pdf' &&
          (puedeVerPdf() ? (
            <>
              <object
                data={url}
                type="application/pdf"
                aria-label={`Comprobante de ${paquete}`}
                className="bg-muted hidden h-[60vh] w-full rounded-lg border sm:block"
              />
              <SinVistaPrevia
                texto="El PDF se abre en otra pestaña o se descarga."
                className="sm:hidden"
              />
            </>
          ) : (
            <SinVistaPrevia texto="Este navegador no enseña el PDF aquí. Ábralo en otra pestaña o descárguelo." />
          ))}

        <DialogFooter>
          <Button
            disabled={!archivo}
            onClick={() => archivo && descargarArchivo(archivo, nombre)}
          >
            <DownloadIcon />
            Descargar
          </Button>
          {/* URL local del navegador: existe solo con el archivo traído */}
          {url ? (
            <Button asChild variant="outline">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                Abrir en otra pestaña
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <ExternalLinkIcon />
              Abrir en otra pestaña
            </Button>
          )}
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

/** Sin visor de PDF, un `object` deja un hueco gris sin aviso. */
function puedeVerPdf(): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.pdfViewerEnabled === 'boolean') return navigator.pdfViewerEnabled
  return Boolean(navigator.mimeTypes?.namedItem?.('application/pdf'))
}

function SinVistaPrevia({ texto, className }: { texto: string; className?: string }) {
  return (
    <div
      className={`bg-muted/40 text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center text-sm ${className ?? ''}`}
    >
      <FileTextIcon className="size-6" />
      {texto}
    </div>
  )
}
