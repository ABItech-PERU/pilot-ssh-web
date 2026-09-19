import { cn } from 'cn'
import { EyeIcon, FileTextIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/format'

/** Archivo ya guardado. No se borra: el servidor solo admite reemplazarlo. */
export interface ArchivoGuardado {
  nombre: string
  /** Qué es, en una palabra: «PDF», «JPEG»… */
  detalle?: string
  /** Miniatura cuando se puede pintar; si no, va el icono. */
  vista?: string | null
  onVer: () => void
}

interface Props {
  id: string
  valor: File | null
  onChange: (archivo: File | null) => void
  /** Lo que admite el selector: `image/png,application/pdf`… */
  accept: string
  /** Qué se puede subir y hasta cuánto, en una línea. */
  ayuda: string
  invalido?: boolean
  guardado?: ArchivoGuardado | null
}

/** Selector de archivo, por arrastre o búsqueda, con nombre, peso y
 *  miniatura. Sustituye al control nativo, que no sigue idioma ni tema. */
export function FileField({
  id,
  valor,
  onChange,
  accept,
  ayuda,
  invalido,
  guardado,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const vista = useVistaPrevia(valor)

  const elegir = (archivo: File | null) => {
    onChange(archivo)
    // Vaciado, el input avisa aunque se elija de nuevo el mismo archivo
    if (!archivo && entrada.current) entrada.current.value = ''
  }

  // El campo va antes que su zona: `peer-*` solo alcanza a lo que viene
  // después, y es lo que pinta el foco del teclado
  const campo = (
    <input
      id={id}
      ref={entrada}
      type="file"
      accept={accept}
      className="peer sr-only"
      onChange={(evento) => elegir(evento.target.files?.[0] ?? null)}
    />
  )

  // Recién elegido o ya guardado, se muestra cuál es el archivo
  const ficha = valor
    ? {
        vista,
        nombre: valor.name,
        detalle: guardado
          ? `${formatFileSize(valor.size)} · reemplaza al guardado`
          : formatFileSize(valor.size),
      }
    : guardado
      ? {
          vista: guardado.vista ?? null,
          nombre: guardado.nombre,
          detalle: guardado.detalle,
        }
      : null

  if (ficha) {
    return (
      <div
        className={cn(
          'space-y-2 rounded-lg border p-3',
          invalido && 'border-destructive',
        )}
      >
        {campo}
        <div className="flex items-center gap-3">
          {ficha.vista ? (
            <img
              src={ficha.vista}
              alt=""
              className="size-10 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-md">
              <FileTextIcon className="size-5" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{ficha.nombre}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {ficha.detalle}
            </span>
          </span>
        </div>
        {/* Debajo, no al lado: en columna estrecha taparían el nombre */}
        <div className="flex justify-end gap-1">
          {guardado && !valor && (
            <Button variant="ghost" size="sm" onClick={guardado.onVer}>
              <EyeIcon className="size-4" />
              Ver
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => entrada.current?.click()}>
            {guardado && !valor ? 'Reemplazar' : 'Cambiar'}
          </Button>
          {valor && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Quitar el archivo"
              onClick={() => elegir(null)}
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {campo}
      <label
        htmlFor={id}
        onDragOver={(evento) => {
          evento.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(evento) => {
          evento.preventDefault()
          setArrastrando(false)
          elegir(evento.dataTransfer.files[0] ?? null)
        }}
        className={cn(
          'peer-focus-visible:outline-ring flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-1',
          arrastrando ? 'border-primary bg-primary/5' : 'hover:border-ring',
          invalido && 'border-destructive',
        )}
      >
        <UploadCloudIcon className="text-muted-foreground size-5" />
        <span className="text-sm font-medium">Arrastre el archivo o elíjalo</span>
        <span className="text-muted-foreground text-xs">{ayuda}</span>
      </label>
    </>
  )
}

/** Miniatura de la imagen elegida. La URL se libera al cambiarla. */
function useVistaPrevia(archivo: File | null): string | null {
  const [vista, setVista] = useState<string | null>(null)

  useEffect(() => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      setVista(null)
      return
    }
    const url = URL.createObjectURL(archivo)
    setVista(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  return vista
}
