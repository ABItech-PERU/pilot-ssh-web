import { ChevronRightIcon, CornerLeftUpIcon, FolderIcon, HouseIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { FormDialogContent } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LineaEsqueleto } from '@/components/states'
import type { MensajeDeCarpetas } from '@/features/terminal/socket'

interface SelectorProps {
  abierto: boolean
  /** Desde dónde empieza a mirar; normalmente donde está la shell. */
  carpeta: string
  onElegir: (ruta: string) => void
  onCerrar: () => void
  pedirCarpetas: (ruta: string) => Promise<MensajeDeCarpetas>
}

/** Elegir carpeta mirando, no tecleando rutas con barras. */
export function SelectorDeCarpeta({
  abierto,
  carpeta,
  onElegir,
  onCerrar,
  pedirCarpetas,
}: SelectorProps) {
  const [listado, setListado] = useState<MensajeDeCarpetas | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const navegar = useCallback(
    async (ruta: string) => {
      setCargando(true)
      setAviso(null)
      const suyo = await pedirCarpetas(ruta)
      if (suyo.error) setAviso(suyo.error)
      else setListado(suyo)
      setCargando(false)
    },
    [pedirCarpetas],
  )

  useEffect(() => {
    if (abierto) void navegar(carpeta)
  }, [abierto, carpeta, navegar])

  const aqui = listado?.ruta ?? carpeta

  return (
    <Dialog open={abierto} onOpenChange={(sigue) => !sigue && onCerrar()}>
      <FormDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elegir carpeta</DialogTitle>
          <DialogDescription>Ahí se guardará el archivo que suba.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => void navegar('~')}
          >
            <HouseIcon />
            Inicio
          </Button>
          {fetchMigas(aqui).map((miga) => (
            <span key={miga.ruta} className="flex items-center gap-1">
              <ChevronRightIcon className="text-muted-foreground size-3" />
              <Button
                size="sm"
                variant="ghost"
                className="font-machine h-7 px-2"
                onClick={() => void navegar(miga.ruta)}
              >
                {miga.nombre}
              </Button>
            </span>
          ))}
        </div>

        <div className="h-56 overflow-y-auto rounded-md border p-1">
          {cargando && (
            <div className="space-y-2 p-2">
              <LineaEsqueleto className="w-2/3" />
              <LineaEsqueleto className="w-1/2" />
              <LineaEsqueleto className="w-3/5" />
            </div>
          )}

          {!cargando && aviso && <p className="text-destructive p-3 text-sm">{aviso}</p>}

          {!cargando && !aviso && (
            <>
              {listado?.padre && (
                <FilaDeCarpeta
                  nombre="Subir un nivel"
                  icono={CornerLeftUpIcon}
                  onClick={() => void navegar(listado.padre)}
                />
              )}
              {listado?.carpetas.map((nombre) => (
                <FilaDeCarpeta
                  key={nombre}
                  nombre={nombre}
                  icono={FolderIcon}
                  onClick={() => void navegar(`${aqui === '/' ? '' : aqui}/${nombre}`)}
                />
              ))}
              {listado && listado.carpetas.length === 0 && (
                <p className="text-muted-foreground p-3 text-sm">
                  Aquí dentro no hay carpetas.
                </p>
              )}
              {listado?.recortada && (
                <p className="text-muted-foreground p-3 text-xs">
                  Hay más carpetas de las que caben en la lista.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button disabled={cargando || Boolean(aviso)} onClick={() => onElegir(aqui)}>
            Subir aquí
          </Button>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}

function FilaDeCarpeta({
  nombre,
  icono: Icono,
  onClick,
}: {
  nombre: string
  icono: typeof FolderIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
    >
      <Icono className="text-muted-foreground size-4 shrink-0" />
      <span className="font-machine truncate">{nombre}</span>
    </button>
  )
}

/** Cada tramo de la ruta, con lo que hay que pedir para volver a él. */
function fetchMigas(ruta: string): { nombre: string; ruta: string }[] {
  const tramos = ruta.split('/').filter(Boolean)
  return tramos.map((nombre, posicion) => ({
    nombre,
    ruta: `/${tramos.slice(0, posicion + 1).join('/')}`,
  }))
}
